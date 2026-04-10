"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";

export default function InvitePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setChecking(false);
    trackEvent("invite_code_pv");
  }, []);

  async function handleSubmit() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem("invite_code", trimmed);
        localStorage.removeItem("plan_id");
        router.push("/onboarding");
      } else if (data.reason === "exhausted") {
        setError("이미 사용한 초대코드예요.");
      } else {
        setError("유효하지 않은 초대코드예요.");
      }
    } catch {
      setError("오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <main
      className="flex flex-col min-h-screen bg-white"
      style={{ maxWidth: 360, margin: "0 auto" }}
    >
      {/* Header */}
      <header
        style={{
          height: 59,
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 500,
            fontSize: 18,
            lineHeight: "1.4em",
            color: "#0A0A0A",
          }}
        >
          뛰뛰빵빵
        </span>
      </header>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "20px 0 0" }}>
            <h1
              style={{
                fontWeight: 600,
                fontSize: 28,
                lineHeight: "1.3em",
                letterSpacing: "-0.0054em",
                color: "#000000",
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              {"AI 러닝 코치가\n내 목표에 맞춰 훈련을 짜줘요"}
            </h1>
            <p
              style={{
                fontWeight: 500,
                fontSize: 18,
                lineHeight: "1.4em",
                color: "#B2BCC5",
                margin: 0,
              }}
            >
              초대코드는 1회 사용할 수 있어요.
            </p>
          </div>

          {/* Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 320 }}>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, paddingBottom: 4 }}>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 15,
                  lineHeight: "1.45em",
                  color: "#0A0A0A",
                }}
              >
                초대코드
              </span>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 15,
                  lineHeight: "1.45em",
                  color: "#FC6C6C",
                }}
              >
                *
              </span>
            </div>

            {/* Input field */}
            <div
              style={{
                border: `1px solid ${error ? "#FC6C6C" : "rgba(60,60,67,0.29)"}`,
                borderRadius: 18,
                height: 52,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
              }}
            >
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="초대코드 입력"
                maxLength={10}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: 16,
                  fontWeight: 500,
                  lineHeight: "1.45em",
                  color: "#0A0A0A",
                  backgroundColor: "transparent",
                  fontFamily: "Pretendard, sans-serif",
                  letterSpacing: "0.05em",
                }}
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: 13,
                  color: "#FC6C6C",
                  margin: "4px 0 0",
                  paddingLeft: 4,
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ padding: "20px 0" }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            style={{
              width: 320,
              borderRadius: 12,
              border: "none",
              backgroundColor: "#0088FF",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: 18,
              lineHeight: "1.4em",
              padding: "16px 24px",
              cursor: code.trim() && !loading ? "pointer" : "default",
              opacity: code.trim() && !loading ? 1 : 0.4,
              fontFamily: "Pretendard, sans-serif",
            }}
          >
            {loading ? "확인 중..." : "AI 러닝 훈련 짜기"}
          </button>
        </div>
      </div>
    </main>
  );
}
