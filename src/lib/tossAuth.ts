import { appLogin } from "@apps-in-toss/web-framework";
import { getOrCreateAnonymousUserId } from "./anonymous-user";

export interface TossProfile {
  userId: string;
  gender: "male" | "female" | null;
  birthdate: string | null; // "YYYYMMDD"
}

const CACHE_KEYS = {
  userId: "toss_user_id",
  gender: "toss_gender",
  birthdate: "toss_birthdate",
};
const EDGE_URL = `${import.meta.env.VITE_API_BASE_URL ?? "https://running-plan-mvp.vercel.app"}/api/toss-auth`;

function normalizeGender(raw: string | undefined): "male" | "female" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "male" || lower === "m" || lower === "남") return "male";
  if (lower === "female" || lower === "f" || lower === "여") return "female";
  return null;
}

let _pendingLogin: Promise<{ authorizationCode: string }> | null = null;

export function prewarmAppLogin() {
  if (!_pendingLogin && !localStorage.getItem(CACHE_KEYS.userId)) {
    _pendingLogin = appLogin().catch(() => null as never);
  }
}

export async function getTossProfile(): Promise<TossProfile> {
  const cachedUserId = localStorage.getItem(CACHE_KEYS.userId);
  if (cachedUserId) {
    return {
      userId: cachedUserId,
      gender: localStorage.getItem(CACHE_KEYS.gender) as "male" | "female" | null,
      birthdate: localStorage.getItem(CACHE_KEYS.birthdate),
    };
  }

  let lastError = "";
  try {
    let loginResult: { authorizationCode: string; referrer: string };
    try {
      loginResult = await (_pendingLogin ?? appLogin()) as { authorizationCode: string; referrer: string };
      _pendingLogin = null;
    } catch (e) {
      lastError = `appLogin failed: ${e}`;
      throw new Error(lastError);
    }
    const { authorizationCode, referrer } = loginResult;
    const controller = new AbortController();
    const fetchTimer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationCode, referrer }),
        signal: controller.signal,
      });
    } catch (e) {
      lastError = `fetch failed: ${e}`;
      throw new Error(lastError);
    }
    clearTimeout(fetchTimer);
    if (!res.ok) {
      lastError = `edge error: ${res.status}`;
      throw new Error(lastError);
    }
    const { tossUserId, gender: rawGender, birthdate } = await res.json();

    const gender = normalizeGender(rawGender);
    localStorage.setItem(CACHE_KEYS.userId, tossUserId);
    if (gender) localStorage.setItem(CACHE_KEYS.gender, gender);
    if (birthdate) localStorage.setItem(CACHE_KEYS.birthdate, birthdate);

    return { userId: tossUserId, gender, birthdate: birthdate ?? null };
  } catch (e) {
    localStorage.setItem("toss_last_error", lastError || String(e));
    const fallbackId = getOrCreateAnonymousUserId();
    return { userId: fallbackId, gender: null, birthdate: null };
  }
}

export async function getTossUserId(): Promise<string> {
  return (await getTossProfile()).userId;
}
