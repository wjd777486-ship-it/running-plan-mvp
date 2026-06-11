import { createServerSupabase } from "@/lib/supabase/server";

const MAX_USES = 3;

export async function POST(request: Request) {
  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) return Response.json({ valid: false, reason: "not_found" });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("invite_codes")
    .select("code, use_count")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[/api/invite/validate]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) return Response.json({ valid: false, reason: "not_found" });
  if (data.use_count >= MAX_USES) return Response.json({ valid: false, reason: "exhausted" });

  return Response.json({ valid: true });
}
