import { Agent, fetch as undiciFetch } from "undici";

const TOSS_API_BASE = "https://apps-in-toss-api.toss.im";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

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

export async function POST(req: Request) {
  try {
    const { authorizationCode, referrer } = await req.json();

    if (!authorizationCode || !referrer) {
      return Response.json({ error: "authorizationCode and referrer required" }, { status: 400, headers: CORS_HEADERS });
    }

    const clientCert = process.env.TOSS_CLIENT_CERT;
    const clientKey = process.env.TOSS_CLIENT_KEY;
    if (!clientCert || !clientKey) {
      return Response.json({ error: "TOSS_CLIENT_CERT or TOSS_CLIENT_KEY not set" }, { status: 500, headers: CORS_HEADERS });
    }

    const agent = new Agent({
      connect: {
        cert: clientCert,
        key: clientKey,
      },
    });

    // 1단계: authorizationCode → accessToken 교환
    const tokenRes = await undiciFetch(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationCode, referrer }),
        dispatcher: agent,
      },
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`[toss-auth] generate-token failed: ${tokenRes.status} ${errText}`);
      return Response.json({ error: "token_exchange_failed", status: tokenRes.status, detail: errText }, { status: 400 });
    }

    const tokenData = await tokenRes.json() as Record<string, unknown>;
    console.log(`[toss-auth] tokenData keys: ${Object.keys(tokenData).join(", ")}, accessToken present: ${!!tokenData.accessToken}`);
    const accessToken = tokenData.accessToken as string | undefined;
    if (!accessToken) {
      console.error(`[toss-auth] no accessToken in response:`, JSON.stringify(tokenData));
      return Response.json({ error: "no_access_token", detail: tokenData }, { status: 400, headers: CORS_HEADERS });
    }

    // 2단계: accessToken으로 사용자 정보 조회
    const userRes = await undiciFetch(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
        dispatcher: agent,
      },
    );

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error(`[toss-auth] login-me failed: ${userRes.status} ${errText}`);
      return Response.json({ error: "user_info_failed", status: userRes.status, detail: errText }, { status: 400 });
    }

    const userInfo = await userRes.json() as Record<string, string>;
    console.log(`[toss-auth] userInfo keys: ${Object.keys(userInfo).join(", ")}`);

    const tossUserId = userInfo.userKey;
    if (!tossUserId) {
      return Response.json({ error: "userKey not found", userInfo }, { status: 400, headers: CORS_HEADERS });
    }

    // 3단계: 개인정보 필드 복호화
    const decryptKeyB64 = process.env.TOSS_DECRYPT_KEY;
    if (!decryptKeyB64) {
      return Response.json({ error: "TOSS_DECRYPT_KEY not set" }, { status: 500, headers: CORS_HEADERS });
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
        gender = rawGender;
      }
    }

    const rawBirthdate = userInfo.birthdate ?? userInfo.birth_date ?? userInfo.birthday;
    if (rawBirthdate) {
      try {
        birthdate = await decryptField(rawBirthdate, cryptoKey, aad);
      } catch {
        birthdate = rawBirthdate;
      }
    }

    return Response.json({ tossUserId, gender, birthdate }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error(`[toss-auth] unhandled error:`, err);
    return Response.json({ error: String(err) }, { status: 500, headers: CORS_HEADERS });
  }
}
