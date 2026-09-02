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

    // 1. Call database RPC for atomic, reliable approval
    const { data: result, error: rpcError } = await supabase.rpc('admin_approve_registration', {
      p_registration_id: registration_id
    });

    if (rpcError) {
      throw new Error(`Approval failed: ${rpcError.message}`);
    }

    const { nis, full_name, email, student_id } = result as any;

    // 2. Fetch registration data for WhatsApp notification
    const { data: registration } = await supabase
      .from('registrations')
      .select('whatsapp, father_name, mother_name, guardian_name')
      .eq('id', registration_id)
      .single();

    // 3. Send WhatsApp notification
    const fonnteKey = Deno.env.get("FONNTE_API_KEY");
    if (fonnteKey && registration?.whatsapp) {
      const parentName = registration.father_name || registration.mother_name || registration.guardian_name || 'Wali';
      const message = `Halo Bapak/Ibu ${parentName}, pendaftaran ananda *${full_name}* di AHE Tepus Wetan telah *DISETUJUI*.\n\nBerikut akun login murid untuk masuk ke portal belajar:\n👤 Username / NIS: *${nis}*\n📧 Email: *${email}*\n🔑 Password Default: *password*\n🌐 Login di: https://ahe-tepus.vercel.app/login\n\nSilakan simpan informasi ini. Terima kasih!`;
      
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
          reference_id: student_id,
          sent_at: new Date().toISOString()
        });
      } catch (waErr) {
        console.error("Failed to send WhatsApp message:", waErr);
        await supabase.from('wa_notifications').insert({
          type: 'confirm_reg',
          recipient: registration.whatsapp,
          message: message,
          status: 'failed',
          reference_id: student_id
        });
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
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
