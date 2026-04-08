import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import KakaoInit from "@/components/KakaoInit";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "뛰뛰빵빵 | AI 러닝 훈련 플랜",
  description: "AI 러닝 코치가 대회 목표에 맞춰 훈련 계획을 짜줘요.",
  openGraph: {
    title: "뛰뛰빵빵 — AI 러닝 훈련 플랜",
    description: "AI 러닝 코치가 대회 목표에 맞춰 훈련 계획을 짜줘요.",
    url: "https://running-plan-mvp.vercel.app",
    siteName: "뛰뛰빵빵",
    images: [{ url: "https://running-plan-mvp.vercel.app/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <KakaoInit />
        {children}
      </body>
    </html>
  );
}
