"use client";

import Script from "next/script";

export default function KakaoInit() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        const kakao = (window as unknown as { Kakao?: { isInitialized: () => boolean; init: (key: string) => void } }).Kakao;
        if (kakao && !kakao.isInitialized()) {
          const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
          if (!key) {
            console.error("[KakaoInit] NEXT_PUBLIC_KAKAO_JS_KEY is not set");
            return;
          }
          try {
            kakao.init(key);
            console.log("[KakaoInit] initialized, key:", key.slice(0, 6) + "...");
          } catch (e) {
            console.error("[KakaoInit] init failed:", e);
          }
        }
      }}
    />
  );
}
