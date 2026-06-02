import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { registration_id } = await req.json()

    if (!registration_id) {
      throw new Error("registration_id is required")
    }

    // 1. Fetch registration record
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single();

    if (regError || !registration) {
      throw new Error(`Registration not found: ${regError?.message || ''}`);
    }

    if (registration.status === 'accepted') {
      throw new Error("Registration is already approved");
    }

    // 2. Generate NIS
    const { data: nisData, error: nisError } = await supabase
      .rpc('generate_nis');

    if (nisError || !nisData) {
      throw new Error(`Failed to generate NIS: ${nisError?.message || ''}`);
    }

    const nis = nisData as string;
    const email = `${nis.toLowerCase()}@ahe.com`;
    const password = 'password'; // default password

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'murid' }
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || ''}`);
    }

    const userId = authData.user.id;

    // 4. Insert Student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        nis,
        full_name: registration.full_name,
        nickname: registration.nickname,
        gender: registration.gender,
        birth_place: registration.birth_place,
        birth_date: registration.birth_date,
        address: registration.address,
        rt: registration.rt,
        rw: registration.rw,
        village: registration.village,
        district: registration.district,
        regency: registration.regency,
        father_name: registration.father_name,
        mother_name: registration.mother_name,
        school_origin: registration.school_origin,
        school_class: registration.school_class,
        photo_url: registration.photo_url,
        status: 'active',
        user_id: userId,
        registration_id: registration.id
      })
      .select()
      .single();

    if (studentError || !student) {
      // Cleanup auth user on failure
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create student record: ${studentError?.message || ''}`);
    }

    // 5. Insert student_les records
    const lesTypes = registration.les_types || [];
    for (const lesType of lesTypes) {
      let maxLevel = null;
      if (lesType === 'les_ahe') maxLevel = 8;
      else if (lesType === 'les_ase') maxLevel = 16;

      const lesMapelName = lesType === 'les_mapel' ? registration.les_mapel_detail : null;

      await supabase.from('student_les').insert({
        student_id: student.id,
        les_type: lesType,
        les_mapel_name: lesMapelName,
        current_level: 1,
        max_level: maxLevel,
        status: 'active'
      });
    }

    // 6. Update registration status
    await supabase
      .from('registrations')
      .update({
        status: 'accepted',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', registration_id);

    // 7. Send WhatsApp notification
    const fonnteKey = Deno.env.get("FONNTE_API_KEY");
    if (fonnteKey && registration.whatsapp) {
      const message = `Halo Bapak/Ibu ${registration.father_name || registration.mother_name || 'Wali'}, pendaftaran ananda ${registration.full_name} di AHE Tepus Wetan telah DISETUJUI.\n\nBerikut akun login ananda:\nUsername: ${nis}\nPassword: ${password}\n\nSilakan gunakan akun ini untuk masuk ke portal murid. Terima kasih!`;
      
      try {
        await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            "Authorization": fonnteKey,
          },
          body: new URLSearchParams({
            target: registration.whatsapp,
            message: message,
          }),
        });

        // Log notification to wa_notifications table
        await supabase.from('wa_notifications').insert({
          type: 'confirm_reg',
          recipient: registration.whatsapp,
          message: message,
          status: 'sent',
          reference_id: student.id,
          sent_at: new Date().toISOString()
        });
      } catch (waErr) {
        console.error("Failed to send WhatsApp message:", waErr);
        // Log as failed
        await supabase.from('wa_notifications').insert({
          type: 'confirm_reg',
          recipient: registration.whatsapp,
          message: message,
          status: 'failed',
          reference_id: student.id
        });
      }
    }

    return new Response(JSON.stringify({ success: true, student, nis, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
