import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

function verifyBasicAuth(req: IncomingMessage): boolean {
  const authHeader = req.headers["authorization"] ?? "";
  if (!authHeader.startsWith("Basic ")) return false;

  const secret = process.env.TOSS_CALLBACK_SECRET;
  if (!secret) return false;

  const encoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  return encoded === secret;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  if (!verifyBasicAuth(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  let userId: string | undefined;
  let tossUserId: string | undefined;

  try {
    const parsed = JSON.parse(body);
    userId = parsed.userId ?? parsed.user_id;
    tossUserId = parsed.tossUserId ?? parsed.toss_user_id;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const targetId = userId ?? tossUserId;
  if (!targetId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "userId or tossUserId required" }));
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("user_id", targetId);

  if (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
}
