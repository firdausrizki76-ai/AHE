import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

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
    const { fileBase64, mimeType, fileName, folderId } = await req.json();
    
    if (!fileBase64 || !mimeType || !fileName || !folderId) {
      throw new Error("Missing required parameters: fileBase64, mimeType, fileName, folderId");
    }

    const accessToken = await getAccessToken();

    const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
    
    // Decode base64 to byte array
    const binaryString = atob(fileBase64);
    const fileBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      fileBytes[i] = binaryString.charCodeAt(i);
    }

    const form = new FormData();
    form.append("metadata", new Blob([metadata], { type: "application/json" }));
    form.append("file", new Blob([fileBytes], { type: mimeType }));

    const upload = await fetch(DRIVE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!upload.ok) {
      const uploadErr = await upload.text();
      throw new Error(`Google Drive upload failed: ${uploadErr}`);
    }

    const result = await upload.json();
    return new Response(JSON.stringify({ fileId: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
