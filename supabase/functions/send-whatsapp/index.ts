import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipient, message } = await req.json()
    const apiKey = Deno.env.get("FONNTE_API_KEY")

    if (!apiKey) {
      throw new Error("FONNTE_API_KEY is not set")
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
      },
      body: new URLSearchParams({
        target: recipient,
        message: message,
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify({ success: true, data }), {
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
