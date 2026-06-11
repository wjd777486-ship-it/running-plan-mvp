// 클라이언트 전용 — Server Component에서 호출 금지
export function getOrCreateAnonymousUserId(): string {
  let id = localStorage.getItem("anonymous_user_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });
    localStorage.setItem("anonymous_user_id", id);
  }
  return id;
}
