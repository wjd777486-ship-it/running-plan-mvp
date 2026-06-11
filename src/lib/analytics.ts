/* eslint-disable @typescript-eslint/no-explicit-any */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (typeof w.gtag === "function") {
    w.gtag("event", eventName, params ?? {});
  } else {
    // gtag 스크립트 로드 전이면 dataLayer 큐에 직접 push
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: eventName, ...params });
  }
}
