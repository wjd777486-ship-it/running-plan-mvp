import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) return Response.json({ valid: false });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("invite_codes")
    .select("code")
    .eq("code", code)
    .eq("is_active", true)
    .is("used_by", null)
    .maybeSingle();

  if (error) {
    console.error("[/api/invite/validate]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ valid: !!data });
}
