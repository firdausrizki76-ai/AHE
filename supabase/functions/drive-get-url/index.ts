import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || '',
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || '',
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") || '',
      grant_type: "refresh_token",
    }),
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google token: ${errText}`);
  }
  
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");

    if (!fileId) {
      throw new Error("Missing required query parameter: fileId");
    }

    const accessToken = await getAccessToken();

    // 1. Get metadata to retrieve the MIME type
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Google Drive metadata fetch failed: ${errText}`);
    }

    const metadata = await metaRes.json();
    const mimeType = metadata.mimeType || 'application/octet-stream';

    // 2. Fetch the file content
    const mediaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      throw new Error(`Google Drive media fetch failed: ${errText}`);
    }

    const fileBuffer = await mediaRes.arrayBuffer();

    return new Response(fileBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600"
      },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
