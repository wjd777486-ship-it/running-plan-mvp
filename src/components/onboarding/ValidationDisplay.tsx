import { useState } from "react";
import type { ValidationResult } from "../../lib/types";
import {
  formatTimeDisplay,
  CheckmarkCircle,
  PlanDataRow,
  AnalysisSection,
} from "./OnboardingCommon";

export function ValidationDisplay({
  result,
  formGoalTime,
  raceLabel,
  raceDate,
  onProceed,
  onBack,
  error,
}: {
  result: ValidationResult;
  formGoalTime: string;
  raceLabel: string;
  raceDate: string;
  onProceed: (useAiGoal: boolean) => void;
  onBack: () => void;
  error: string | null;
}) {
  const { validation } = result;
  const status = validation.status;
  const isGreen = status === "GREEN";
  const aiTime = validation.realistic_goal.suggested_time;
  const aiTimeDisplay = aiTime ? formatTimeDisplay(aiTime) : null;
  const [selectedPlan, setSelectedPlan] = useState<"my" | "ai">("my");

  const isHardGoal = !isGreen && !!aiTimeDisplay;
  const isEasyGoal = validation.vdot.gap < 0 && !isHardGoal;

  const titleText = isEasyGoal
    ? "러너님에게\n너무 쉬운 목표예요"
    : isHardGoal
    ? "러너님에게 지금은\n어려운 목표예요"
    : "러너님이 충분히\n달성할 수 있는 목표예요";
  const subText = isEasyGoal
    ? "AI 러닝 코치가 훈련 계획을 짜줄게요."
    : isHardGoal
    ? "AI 러닝 코치가 목표를 추천해드릴게요."
    : "AI 러닝 코치가 훈련 계획을 짜줄게요.";

  const myCardSelected = isGreen || selectedPlan === "my";

  return (
    <main className="flex flex-col min-h-screen max-w-[320px] mx-auto bg-white">
      <div className="shrink-0" style={{ padding: 20 }}>
        <h1
          className="whitespace-pre-line"
          style={{ fontWeight: 600, fontSize: 28, lineHeight: "1.3em", letterSpacing: "-0.0054em", color: "#000000" }}
        >
          {titleText}
        </h1>
        <p style={{ fontWeight: 500, fontSize: 18, lineHeight: "1.4em", color: "#B2BCC5", marginTop: 6 }}>
          {subText}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button
            type="button"
            onClick={() => { if (!isGreen) setSelectedPlan("my"); }}
            className="w-full text-left"
            style={{
              borderRadius: 14,
              border: myCardSelected ? "2px solid #0088FF" : "1px solid rgba(60,60,67,0.18)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontWeight: 600, fontSize: 17, lineHeight: "1.45em", letterSpacing: "-0.0254em", color: "#0A0A0A" }}>
                내가 세운 목표
              </span>
              <CheckmarkCircle selected={myCardSelected} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              <PlanDataRow label="코스" value={raceLabel} />
              <PlanDataRow label="목표 기록" value={formGoalTime} />
              <PlanDataRow label="대회 날짜" value={raceDate} />
            </div>
          </button>

          {!isGreen && aiTimeDisplay && (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: 21,
                  backgroundColor: "#0088FF",
                  borderRadius: 9999,
                  padding: "2px 10px",
                  zIndex: 1,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, lineHeight: "1.19em", letterSpacing: "-0.0059em", color: "#FFFFFF" }}>
                  추천
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan("ai")}
                className="w-full text-left"
                style={{
                  borderRadius: 14,
                  border: selectedPlan === "ai" ? "2px solid #0088FF" : "1px solid rgba(60,60,67,0.18)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontWeight: 600, fontSize: 17, lineHeight: "1.45em", letterSpacing: "-0.0254em", color: "#0A0A0A" }}>
                      AI 추천 목표
                    </span>
                    <CheckmarkCircle selected={selectedPlan === "ai"} />
                  </div>
                  <p style={{ fontWeight: 500, fontSize: 14, lineHeight: "1.4em", letterSpacing: "-0.0107em", color: "#4A5565", marginTop: 4, maxWidth: 240 }}>
                    {validation.realistic_goal.message}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  <PlanDataRow label="코스" value={raceLabel} />
                  <PlanDataRow label="목표 기록" value={aiTimeDisplay} valueColor="#0088FF" />
                  <PlanDataRow label="대회 날짜" value={raceDate} />
                </div>
              </button>
            </div>
          )}
        </div>

        <div style={{ margin: "20px 0", borderTop: "1px solid rgba(60,60,67,0.12)" }} />

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 17, lineHeight: "1.45em", letterSpacing: "-0.0254em", color: "#0A0A0A" }}>
            AI 분석 결과
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AnalysisSection
              emoji="💪"
              label="VDOT 분석"
              labelColor="#008236"
              items={[
                validation.vdot.message,
                `현재 ${validation.vdot.estimated_current} → 목표 ${validation.vdot.required_for_goal} (차이 ${validation.vdot.gap})`,
              ]}
            />
            <AnalysisSection
              emoji="⚠️"
              label="훈련 기간"
              labelColor="#CA3500"
              items={[
                validation.training_period.message,
                `총 ${validation.training_period.total_weeks}주 가능 / 권장 ${validation.training_period.weeks_needed_for_volume}주`,
              ]}
            />
            <AnalysisSection
              emoji="💡"
              label="장거리 런"
              labelColor="#0088FF"
              items={[
                validation.max_run_distance.message,
                `현재 최대 ${validation.max_run_distance.current_max_km}km / 권장 ${validation.max_run_distance.recommended_min_km}km`,
              ]}
            />
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>

      <div style={{ height: 96 }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "16px 20px",
        paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        backgroundColor: "#F5F5F9",
      }}>
        {error && <p className="text-sm text-[#FC6C6C] text-center" style={{ marginBottom: 12 }}>{error}</p>}
        <button
          onClick={() => onProceed(selectedPlan === "ai")}
          className="w-full"
          style={{
            backgroundColor: "#0088FF",
            color: "#FFFFFF",
            borderRadius: 12,
            padding: "16px 24px",
            fontWeight: 600,
            fontSize: 18,
            lineHeight: "1.4em",
          }}
        >
          {selectedPlan === "ai" ? "AI 추천 목표로 훈련 짜기" : "내가 세운 목표로 훈련 짜기"}
        </button>
      </div>
    </main>
  );
}
