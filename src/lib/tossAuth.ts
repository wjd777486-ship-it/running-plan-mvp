import { appLogin } from "@apps-in-toss/web-framework";
import { getOrCreateAnonymousUserId } from "./anonymous-user";

const CACHE_KEY = "toss_user_id";
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toss-auth`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function getTossUserId(): Promise<string> {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) return cached;

  try {
    const { authorizationCode } = await appLogin();

    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ authorizationCode }),
    });

    if (!res.ok) throw new Error(`edge function error: ${res.status}`);

    const { tossUserId } = await res.json();
    localStorage.setItem(CACHE_KEY, tossUserId);
    return tossUserId;
  } catch {
    // 토스 앱 외부(로컬 브라우저 등)에서는 익명 ID로 fallback
    return getOrCreateAnonymousUserId();
  }
}
