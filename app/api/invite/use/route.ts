import { createServerSupabase } from "@/lib/supabase/server";

const MAX_USES = 3;

export async function POST(request: Request) {
  let body: { code: string; sessionId: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const { sessionId } = body;
  if (!code || !sessionId) {
    return Response.json({ error: "code and sessionId required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // 현재 use_count 조회
  const { data, error: fetchError } = await supabase
    .from("invite_codes")
    .select("use_count")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError || !data) {
    return Response.json({ success: false });
  }

  const newCount = data.use_count + 1;
  const { error } = await supabase
    .from("invite_codes")
    .update({
      use_count: newCount,
      used_by: sessionId,
      used_at: new Date().toISOString(),
      is_active: newCount < MAX_USES,
    })
    .eq("code", code)
    .eq("use_count", data.use_count); // optimistic lock

  if (error) {
    console.error("[/api/invite/use]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
