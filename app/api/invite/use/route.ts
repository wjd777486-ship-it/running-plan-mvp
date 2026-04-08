import { createServerSupabase } from "@/lib/supabase/server";

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
  const { error } = await supabase
    .from("invite_codes")
    .update({ used_by: sessionId, used_at: new Date().toISOString() })
    .eq("code", code)
    .eq("is_active", true)
    .is("used_by", null);

  if (error) {
    console.error("[/api/invite/use]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
