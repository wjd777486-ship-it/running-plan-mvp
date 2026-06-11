// 클라이언트 전용 — Server Component에서 호출 금지
export function getOrCreateAnonymousUserId(): string {
  let id = localStorage.getItem("anonymous_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("anonymous_user_id", id);
  }
  return id;
}
