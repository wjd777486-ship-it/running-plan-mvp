import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOSS_API_BASE = "https://apps-in-toss-api.toss.im";

function base64urlToBytes(b64url: string): Uint8Array {
  const standard = b64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(b64url.length + (4 - (b64url.length % 4)) % 4, "=");
  return Uint8Array.from(atob(standard), (c) => c.charCodeAt(0));
}

async function decryptField(encryptedB64: string, key: CryptoKey, aad: Uint8Array): Promise<string> {
  const bytes = base64urlToBytes(encryptedB64);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128, additionalData: aad },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { authorizationCode, referrer } = await req.json();
    console.log(`[toss-auth] authorizationCode length=${authorizationCode?.length ?? 0}, referrer=${referrer}`);

    if (!authorizationCode || !referrer) {
      return new Response(JSON.stringify({ error: "authorizationCode and referrer required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientCert = Deno.env.get("TOSS_CLIENT_CERT");
    const clientKey = Deno.env.get("TOSS_CLIENT_KEY");
    if (!clientCert || !clientKey) {
      return new Response(JSON.stringify({ error: "TOSS_CLIENT_CERT or TOSS_CLIENT_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[toss-auth] cert length=${clientCert.length}, key length=${clientKey.length}`);
    console.log(`[toss-auth] cert starts with: ${clientCert.slice(0, 30)}`);
    console.log(`[toss-auth] createHttpClient available: ${typeof Deno.createHttpClient}`);

    const httpClient = Deno.createHttpClient({ certChain: clientCert, privateKey: clientKey });
    console.log(`[toss-auth] httpClient created: ${!!httpClient}`);

    // 1단계: authorizationCode → accessToken 교환
    const tokenRes = await fetch(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationCode, referrer }),
        client: httpClient,
      },
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.log(`[toss-auth] generate-token failed: ${tokenRes.status} ${errText}`);
      return new Response(JSON.stringify({ error: "token_exchange_failed", status: tokenRes.status, detail: errText }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.accessToken;
    console.log(`[toss-auth] accessToken acquired`);

    // 2단계: accessToken으로 사용자 정보 조회
    const userRes = await fetch(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
        client: httpClient,
      },
    );

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.log(`[toss-auth] login-me failed: ${userRes.status} ${errText}`);
      return new Response(JSON.stringify({ error: "user_info_failed", status: userRes.status, detail: errText }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userInfo = await userRes.json();
    console.log(`[toss-auth] userInfo keys: ${Object.keys(userInfo).join(", ")}`);

    const tossUserId = userInfo.userKey as string;
    if (!tossUserId) {
      return new Response(JSON.stringify({ error: "userKey not found", userInfo }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3단계: 개인정보 필드 복호화 (AES-256-GCM, IV 앞에 붙음, AAD="TOSS")
    const decryptKeyB64 = Deno.env.get("TOSS_DECRYPT_KEY");
    if (!decryptKeyB64) {
      return new Response(JSON.stringify({ error: "TOSS_DECRYPT_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyBytes = base64urlToBytes(decryptKeyB64);
    const aad = new TextEncoder().encode("TOSS");
    const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);

    let gender: string | null = null;
    let birthdate: string | null = null;

    const rawGender = userInfo.gender ?? userInfo.sex;
    if (rawGender) {
      try {
        gender = await decryptField(rawGender, cryptoKey, aad);
      } catch {
        console.log("[toss-auth] gender decrypt failed, using raw value");
        gender = rawGender;
      }
    }

    const rawBirthdate = userInfo.birthdate ?? userInfo.birth_date ?? userInfo.birthday;
    if (rawBirthdate) {
      try {
        birthdate = await decryptField(rawBirthdate, cryptoKey, aad);
      } catch {
        console.log("[toss-auth] birthdate decrypt failed, using raw value");
        birthdate = rawBirthdate;
      }
    }

    return new Response(JSON.stringify({ tossUserId, gender, birthdate }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log(`[toss-auth] unhandled error: ${err}`);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
