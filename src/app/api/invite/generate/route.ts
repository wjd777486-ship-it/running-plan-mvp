import { createServerSupabase } from "@/lib/supabase/server";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function POST(request: Request) {
  let body: { sessionId: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });

  const supabase = createServerSupabase();

  // 이미 발급된 코드가 있으면 재사용
  const { data: existing } = await supabase
    .from("invite_codes")
    .select("code")
    .eq("created_by", sessionId)
    .eq("is_active", true)
    .is("used_by", null)
    .maybeSingle();

  if (existing) {
    return Response.json({ code: existing.code });
  }

  // 중복 없는 코드 생성 (최대 5회 시도)
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    const { data: dup } = await supabase
      .from("invite_codes")
      .select("code")
      .eq("code", candidate)
      .maybeSingle();
    if (!dup) { code = candidate; break; }
  }
  if (!code) return Response.json({ error: "Code generation failed" }, { status: 500 });

  const { error } = await supabase.from("invite_codes").insert({
    code,
    created_by: sessionId,
    is_active: true,
  });

  if (error) {
    console.error("[/api/invite/generate]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ code });
}
