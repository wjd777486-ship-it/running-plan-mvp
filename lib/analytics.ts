/* eslint-disable @typescript-eslint/no-explicit-any */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (typeof (window as any).gtag !== "function") return;
  (window as any).gtag("event", eventName, params ?? {});
}
