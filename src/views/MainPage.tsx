import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stepper } from "@toss/tds-mobile";

function NumberBadge({ n }: { n: number }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: "rgba(7,25,76,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#111111", lineHeight: 1 }}>{n}</span>
    </div>
  );
}
import { getTossProfile } from "../lib/tossAuth";

export default function MainPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleStart() {
    if (isLoading) return;
    setIsLoading(true);
    localStorage.removeItem("toss_user_id");
    localStorage.removeItem("toss_gender");
    localStorage.removeItem("toss_birthdate");
    try {
      await getTossProfile();
    } catch {
      // ignore — getTossProfile handles errors internally
    }
    if (localStorage.getItem("toss_user_id")) {
      navigate("/onboarding");
    } else {
      showToast("로그인에 실패했어요. 다시 시도해 주세요.");
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        backgroundColor: "#F5F5F9",
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 8,
          paddingBottom: 120,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div style={{ width: "100%", marginBottom: 32 }}>
          <p
            style={{
              fontFamily: "Pretendard, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: "140%",
              color: "#8E8E93",
              margin: 0,
              marginBottom: 6,
            }}
          >
            러닝 훈련 계획 짜주는
          </p>
          <h1
            style={{
              fontFamily: "Pretendard, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: "130%",
              color: "#111111",
              margin: 0,
            }}
          >
            AI 러닝 코치, 달려
          </h1>
        </div>

        <div style={{ marginBottom: 40 }}>
          <img
            src="/images/main-illustration.png"
            alt="달려 러닝 코치"
            style={{ width: 222, height: 222, objectFit: "contain" }}
          />
        </div>

        <div style={{ width: "100%" }}>
          <Stepper>
            <Stepper.StepperRow
              left={<NumberBadge n={1} />}
              center={
                <Stepper.Texts
                  type="A"
                  title="러닝 목표를 알려주면"
                />
              }
            />
            <Stepper.StepperRow
              left={<NumberBadge n={2} />}
              center={
                <Stepper.Texts
                  type="A"
                  title="AI 러닝 코치가 분석해서"
                />
              }
            />
            <Stepper.StepperRow
              hideLine
              left={<NumberBadge n={3} />}
              center={
                <Stepper.Texts
                  type="A"
                  title="훈련 계획을 세워줘요"
                />
              }
            />
          </Stepper>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 20px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          backgroundColor: "#F5F5F9",
        }}
      >
        <button
          type="button"
          onClick={handleStart}
          disabled={isLoading}
          className="w-full bg-[#0088FF] text-white font-semibold active:opacity-90 transition-opacity disabled:opacity-50"
          style={{ paddingTop: 16, paddingBottom: 16, fontSize: 18, lineHeight: "1.40", borderRadius: 12 }}
        >
          {isLoading ? "로그인 중..." : "AI 훈련 계획 세우기"}
        </button>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          backgroundColor: "#222324", color: "#FFFFFF", borderRadius: 999,
          padding: "14px 24px", width: 320, textAlign: "center",
          fontSize: 14, fontWeight: 500, zIndex: 100, boxSizing: "border-box" as const,
          boxShadow: "0px 4px 10px 0px rgba(11, 12, 12, 0.16)",
        }}>
          {toast}
        </div>
      )}
    </main>
  );
}
