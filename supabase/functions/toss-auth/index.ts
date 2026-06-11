import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { authorizationCode } = await req.json();

    if (!authorizationCode) {
      return new Response(JSON.stringify({ error: "authorizationCode required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("TOSS_CLIENT_ID");
    const clientSecret = Deno.env.get("TOSS_CLIENT_SECRET");
    // 개발자 포털 토스 로그인 탭에서 토큰 엔드포인트 URL 확인 후 설정
    const tokenEndpoint = Deno.env.get("TOSS_TOKEN_ENDPOINT") ?? "https://accounts.toss.im/oauth2/token";

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "TOSS_CLIENT_ID / TOSS_CLIENT_SECRET not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return new Response(JSON.stringify({ error: "token_exchange_failed", detail }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();

    // 개발자 포털에서 토큰 응답 구조 확인 후 올바른 필드로 교체
    // OIDC id_token 방식이면 JWT 디코딩 후 sub 필드 사용
    const tossUserId: string | undefined =
      tokenData.sub ?? tokenData.user_id ?? tokenData.toss_user_id;

    if (!tossUserId) {
      return new Response(
        JSON.stringify({ error: "user_id field not found — check token response shape", tokenData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ tossUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
