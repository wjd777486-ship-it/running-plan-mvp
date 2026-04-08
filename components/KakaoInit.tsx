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
          kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY!);
        }
      }}
    />
  );
}
