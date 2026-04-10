"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createPlan } from "@/app/actions/plan";
import { getOrCreateAnonymousUserId } from "@/lib/anonymous-user";
import type { RunnerFormData, RaceType, ValidationResult, GeneratedPlan } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_FORM: RunnerFormData = {
  raceType: "full",
  raceDate: "",
  goalHours: 0,
  goalMinutes: 0,
  pbHours: 0,
  pbMinutes: 0,
  pbSeconds: 0,
  noPb: false,
  gender: "male",
  age: 0,
  expYears: 0,
  expMonths: 0,
  weeklyMileage1: 0,
  weeklyMileage4: 0,
  maxRunDistance: 0,
  trainingDays: [],
  joggingDist: 0,
  joggingPaceMin: 6,
  joggingPaceSec: 0,
  joggingHr: 0,
  joggingCadence: null,
  runningDist: 0,
  runningPaceMin: 5,
  runningPaceSec: 0,
  runningHr: 0,
  runningCadence: null,
};

const RACE_OPTIONS: { value: RaceType; label: string }[] = [
  { value: "5k", label: "5km" },
  { value: "10k", label: "10km" },
  { value: "half", label: "하프" },
  { value: "full", label: "풀" },
];

const DAYS_OF_WEEK = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
];

function formatTimeDisplay(timeStr: string): string {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    const [h, m] = parts;
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  }
  return `${parts[0]}분`;
}

function CheckmarkCircle({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 20, height: 20, borderRadius: 9999, backgroundColor: "#0088FF" }}
      >
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div
      className="shrink-0"
      style={{ width: 20, height: 20, borderRadius: 9999, border: "2px solid #D1D5DC" }}
    />
  );
}

function PlanDataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <span style={{ fontWeight: 500, fontSize: 15, lineHeight: "1.5em", letterSpacing: "-0.0156em", color: "#4A5565" }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.5em", letterSpacing: "-0.0156em", color: valueColor ?? "#0A0A0A", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function AnalysisSection({ emoji, label, labelColor, items }: { emoji: string; label: string; labelColor: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 400, fontSize: 16, lineHeight: "1.5em", color: "#0A0A0A" }}>{emoji}</span>
        <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.5em", color: labelColor }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <span style={{ fontWeight: 400, fontSize: 14, lineHeight: "1.5em", color: "#364153", flexShrink: 0, paddingLeft: 4 }}>•</span>
            <span style={{ fontWeight: 400, fontSize: 14, lineHeight: "1.5em", color: "#364153", letterSpacing: "-0.0107em" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Design primitives ─────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex w-full">
      {([1, 2, 3] as const).map((s) => (
        <div
          key={s}
          className={cn(
            "h-[3px] flex-1 transition-colors duration-300",
            s <= step ? "bg-[#0088FF]" : "bg-[#E5E5EA]"
          )}
        />
      ))}
    </div>
  );
}

// Body 2/medium: 15px / 500
// asterisk: 15px / 500 / #FC6C6C
// label row: row, flex-end, gap 2px, padding-bottom 4px
function FieldLabel({
  label,
  required,
  sub,
}: {
  label: string;
  required?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-end gap-[2px] pb-1">
      <span
        className="font-medium text-black"
        style={{ fontSize: 15, lineHeight: "1.45" }}
      >
        {label}
      </span>
      {sub && (
        <span
          className="text-[#727272] ml-[2px]"
          style={{ fontSize: 15, lineHeight: "1.45", fontWeight: 500 }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

// Input number box: 60×52px, padding 14px 16px, radius 8px, border rgba(60,60,67,0.29)
// Body 1/medium: 16px / 500
function NumBox({
  value,
  onChange,
  min,
  max,
  wide,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-[rgba(60,60,67,0.29)] rounded-lg flex items-center justify-center transition-opacity",
        wide ? "w-20 h-[52px]" : "w-[60px] h-[52px]",
        disabled && "opacity-40"
      )}
    >
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        className="w-full h-full text-center font-medium outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed [&:focus::placeholder]:text-transparent"
        style={{ fontSize: 16, lineHeight: "1.45" }}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </div>
  );
}

// chip size=m: padding 8px 14px, text 16px/600 (gender)
// chip size=s: padding 6px 12px, text 14px/600 (course, days)
function Chip({
  label,
  selected,
  onClick,
  flex,
  size = "s",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  flex?: boolean;
  size?: "s" | "m";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border font-semibold transition-colors text-center",
        size === "m"
          ? "px-[14px] py-2 text-base"
          : "px-3 py-1.5 text-[14px]",
        flex && "flex-1",
        selected
          ? "border-[#0088FF] text-[#0088FF]"
          : "border-[rgba(60,60,67,0.6)] text-black"
      )}
    >
      {label}
    </button>
  );
}

// style_WAU50J: 17px / 600 / lh 1.45
// style_WH0AYA: 14px / 500 / lh 1.40
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <p
        className="font-semibold text-black"
        style={{ fontSize: 17, lineHeight: "1.45" }}
      >
        {title}
      </p>
      {sub && (
        <p
          className="font-medium text-[#5E6368] mt-1"
          style={{ fontSize: 14, lineHeight: "1.40" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Validation result screen ───────────────────────────────────────────────────

function ValidationDisplay({
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
  const isEasyGoal = validation.vdot.gap < 0;

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
      {/* Header: height 59px, padding 12px 20px */}
      <header
        className="flex items-center shrink-0"
        style={{ height: 59, padding: "12px 20px" }}
      >
        <button
          onClick={onBack}
          className="p-1 -ml-1"
        >
          <ChevronLeft className="size-6" />
        </button>
      </header>

      {/* Title: padding 20px, gap 6px */}
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Cards: gap 16px */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* "내가 세운 목표" card */}
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
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontWeight: 600, fontSize: 17, lineHeight: "1.45em", letterSpacing: "-0.0254em", color: "#0A0A0A" }}>
                내가 세운 목표
              </span>
              <CheckmarkCircle selected={myCardSelected} />
            </div>
            {/* Data rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              <PlanDataRow label="코스" value={raceLabel} />
              <PlanDataRow label="목표 기록" value={formGoalTime} />
              <PlanDataRow label="대회 날짜" value={raceDate} />
            </div>
          </button>

          {/* "AI 추천 목표" card — YELLOW/RED only */}
          {!isGreen && aiTimeDisplay && (
            <div style={{ position: "relative" }}>
              {/* 추천 badge */}
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
                {/* Header + subtitle */}
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
                {/* Data rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  <PlanDataRow label="코스" value={raceLabel} />
                  <PlanDataRow label="목표 기록" value={aiTimeDisplay} valueColor="#0088FF" />
                  <PlanDataRow label="대회 날짜" value={raceDate} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ margin: "20px 0", borderTop: "1px solid rgba(60,60,67,0.12)" }} />

        {/* AI 분석 결과 */}
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

      {/* CTA: padding 20px */}
      <div className="shrink-0" style={{ padding: 20 }}>
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<RunnerFormData>(INITIAL_FORM);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [appStep, setAppStep] = useState<"form" | "validating" | "result" | "generating">("form");
  const [generatingWeeks, setGeneratingWeeks] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [step1Errors, setStep1Errors] = useState<{ raceDate?: string; raceType?: string; goalTime?: string }>({});
  const [step2Errors, setStep2Errors] = useState<{ age?: string }>({});
  const [step3Errors, setStep3Errors] = useState<{ trainingDays?: string; joggingHr?: string; runningHr?: string }>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 초대코드 게이트: localStorage에 없으면 /invite로 리다이렉트
  // 기존 플랜이 있으면 바로 플랜 페이지로 이동
  useEffect(() => {
    const code = localStorage.getItem("invite_code");
    if (!code) { router.replace("/invite"); return; }
    const savedPlanId = localStorage.getItem("plan_id");
    if (savedPlanId) { router.replace(`/plan?id=${savedPlanId}`); return; }
  }, [router]);

  // GA4: 화면 전환 시 PV 이벤트
  useEffect(() => {
    if (appStep === "form") {
      if (formStep === 1) trackEvent("onboarding_goal_pv");
      else if (formStep === 2) trackEvent("onboarding_basic_info_pv");
      else if (formStep === 3) trackEvent("onboarding_running_info_pv");
    } else if (appStep === "validating") {
      trackEvent("goal_validation_loading_pv");
    } else if (appStep === "result") {
      const hasAiSuggestion = !!validationResult?.validation.realistic_goal.suggested_time;
      trackEvent(hasAiSuggestion ? "goal_suggestion_ai_pv" : "goal_suggestion_default_pv");
    } else if (appStep === "generating") {
      trackEvent("training_plan_loading_pv");
    }
  }, [appStep, formStep]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof RunnerFormData>(key: K, value: RunnerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: string) {
    setForm((prev) => ({
      ...prev,
      trainingDays: prev.trainingDays.includes(day)
        ? prev.trainingDays.filter((d) => d !== day)
        : [...prev.trainingDays, day],
    }));
  }

  function toggleAllDays() {
    setForm((prev) => ({
      ...prev,
      trainingDays:
        prev.trainingDays.length === 7 ? [] : DAYS_OF_WEEK.map((d) => d.value),
    }));
  }

  function toggleNoPb() {
    setForm((prev) => ({
      ...prev,
      noPb: !prev.noPb,
      ...(!prev.noPb ? { pbHours: 0, pbMinutes: 0, pbSeconds: 0 } : {}),
    }));
  }

  function handleBack() {
    setError(null);
    if (formStep > 1) {
      setFormStep((s) => (s - 1) as 1 | 2 | 3);
    } else {
      router.back();
    }
  }

  function handleNext() {
    setError(null);

    if (formStep === 1) {
      const errors: typeof step1Errors = {};
      if (!form.raceDate) errors.raceDate = "대회 일시를 입력해 주세요.";
      if (!form.raceType) errors.raceType = "참가 코스를 입력해 주세요.";
      if (form.goalHours === 0 && form.goalMinutes === 0) errors.goalTime = "목표 기록을 입력해 주세요.";
      if (Object.keys(errors).length > 0) { setStep1Errors(errors); return; }
      setStep1Errors({});
    }

    if (formStep === 2) {
      const errors: typeof step2Errors = {};
      if (form.age === 0) errors.age = "나이를 입력해 주세요.";
      if (Object.keys(errors).length > 0) { setStep2Errors(errors); return; }
      setStep2Errors({});
    }

    if (formStep === 3) {
      const errors: typeof step3Errors = {};
      if (form.trainingDays.length === 0) errors.trainingDays = "훈련 가능 요일을 입력해 주세요.";
      if (form.joggingHr === 0) errors.joggingHr = "조깅 심박을 입력해 주세요.";
      if (form.runningHr === 0) errors.runningHr = "러닝 심박을 입력해 주세요.";
      if (Object.keys(errors).length > 0) { setStep3Errors(errors); return; }
      setStep3Errors({});
    }

    if (formStep < 3) {
      setFormStep((s) => (s + 1) as 1 | 2 | 3);
    } else {
      handleValidate();
    }
  }

  async function handleValidate() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // 초대코드 use_count 체크 및 차감 (validate API도 비용 발생)
    const inviteCode = localStorage.getItem("invite_code");
    const sessionId = getOrCreateAnonymousUserId();
    if (inviteCode) {
      try {
        const validateRes = await fetch("/api/invite/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: inviteCode }),
        });
        const validateData = await validateRes.json();
        if (!validateData.valid) {
          showToast(validateData.reason === "exhausted"
            ? "이미 3회 사용한 초대코드예요."
            : "유효하지 않은 초대코드예요.");
          return;
        }
        await fetch("/api/invite/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: inviteCode, sessionId }),
        });
      } catch {
        // 네트워크 오류 시 계속 진행
      }
    }

    setAppStep("validating");
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`검증 실패 (${res.status})`);
      const data: ValidationResult = await res.json();
      setValidationResult(data);
      setAppStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setAppStep("form");
      setIsSubmitting(false);
    }
  }

  async function handleGenerate(useAiGoal: boolean) {
    if (!validationResult) return;

    setError(null);
    setGeneratingWeeks(validationResult.validation.training_period.total_weeks);
    setAppStep("generating");

    let formData = form;
    if (useAiGoal && validationResult.validation.realistic_goal.suggested_time) {
      const parts = validationResult.validation.realistic_goal.suggested_time.split(":").map(Number);
      const goalHours = parts.length === 3 ? parts[0] : 0;
      const goalMinutes = parts.length === 3 ? parts[1] : parts[0];
      formData = { ...form, goalHours, goalMinutes };
    }

    try {
      const genRes = await fetch("/api/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, validation: validationResult, useAiGoal }),
      });
      if (!genRes.ok) throw new Error(`플랜 생성 실패 (${genRes.status})`);
      if (!genRes.body) throw new Error("스트림 응답 없음");

      const reader = genRes.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (fullText.includes("__ERROR__:")) {
          const msg = fullText.split("__ERROR__:")[1].trim();
          throw new Error(msg);
        }
      }

      const planMarker = "__PLAN_WITH_DATES__:";
      if (!fullText.includes(planMarker)) throw new Error("플랜 응답에서 날짜 배정 데이터를 찾을 수 없어요. 다시 시도해주세요.");
      const generatedPlan: GeneratedPlan = JSON.parse(fullText.split(planMarker)[1]);
      setGeneratingWeeks(generatedPlan.plan_summary.total_weeks);
      const userId = getOrCreateAnonymousUserId();
      const result = await createPlan(form, generatedPlan, userId);
      if ("error" in result) throw new Error(result.error);


      localStorage.setItem("plan_id", result.planId);
      router.push(`/plan?id=${result.planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setAppStep("result");
    }
  }

  // Date constraints
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 84);

  const pbLabel = RACE_OPTIONS.find((r) => r.value === form.raceType)?.label ?? "코스";

  // ── Validating / Generating screen ─────────────────────────────────────────
  if (appStep === "validating" || appStep === "generating") {
    const mainText = appStep === "generating"
      ? `AI 러닝 코치가\n${generatingWeeks}주차 훈련 계획 짜는 중`
      : "AI 러닝 코치가\n훈련 계획을 짜고 있어요";
    const subText = appStep === "generating"
      ? "최대 1분 이상 걸릴 수 있어요."
      : "목표까지 남은 기간에 따라\n1분 이상 걸릴 수 있어요.";

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F5F5F9] px-5">
        <p
          className="font-semibold text-black text-center whitespace-pre-line"
          style={{ fontSize: 18, lineHeight: 1.4 }}
        >
          {mainText}
        </p>
        <div className="flex flex-col items-center gap-6">
          <div
            className="animate-spin"
            style={{
              width: 68,
              height: 68,
              borderRadius: 9999,
              border: "4px solid #E5E7EB",
              borderTopColor: "#2B7FFF",
            }}
          />
          <p
            className="font-medium text-[#8E8E93] text-center whitespace-pre-line"
            style={{ fontSize: 14, lineHeight: 1.4 }}
          >
            {subText}
          </p>
        </div>

        {/* TIP 섹션 - 플랜 생성 중에만 표시 */}
        {appStep === "generating" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 240 }}>
            <span style={{ fontFamily: "Pretendard, sans-serif", fontSize: 14, fontWeight: 600, lineHeight: "140%", color: "#000" }}>
              훈련 계획표 활용 TIP
            </span>
            <ol style={{ width: 240, flexShrink: 0, fontFamily: "Pretendard, sans-serif", fontSize: 13, fontWeight: 500, lineHeight: "140%", color: "#000", margin: 0, paddingLeft: 18, listStyleType: "decimal" }}>
              <li>훈련 계획 화면에서 <span className="text-[#0088FF]">[훈련 저장] 버튼 클릭</span></li>
              <li>복사한 <span className="text-[#0088FF]">링크를 편한 곳에 저장</span></li>
              <li><span className="text-[#0088FF]">저장된 링크에 접속</span>해 매일 훈련 확인!</li>
            </ol>
          </div>
        )}
      </main>
    );
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  const formGoalTime = form.goalHours > 0
    ? `${form.goalHours}시간 ${form.goalMinutes}분`
    : `${form.goalMinutes}분`;
  const raceLabel = RACE_OPTIONS.find((r) => r.value === form.raceType)?.label ?? form.raceType;

  if (appStep === "result" && validationResult) {
    return (
      <ValidationDisplay
        result={validationResult}
        formGoalTime={formGoalTime}
        raceLabel={raceLabel}
        raceDate={form.raceDate}
        onProceed={handleGenerate}
        onBack={() => { setAppStep("form"); setError(null); }}
        error={error}
      />
    );
  }

  // ── Form screen ─────────────────────────────────────────────────────────────
  return (
    <>
    <main className="flex flex-col min-h-screen max-w-[320px] mx-auto bg-white">

      {/* Header: h:59px, px:20px, py:12px */}
      <header
        className="flex items-center px-5 shrink-0"
        style={{ height: 59, paddingTop: 12, paddingBottom: 12 }}
      >
        <button onClick={handleBack} className="p-1 -ml-1">
          <ChevronLeft className="size-6" />
        </button>
      </header>

      {/* Progress bar: 3px, no extra padding */}
      <ProgressBar step={formStep} />

      {/* Title: padding 20px (all sides) */}
      <div className="p-5 shrink-0">
        <h1
          className="font-semibold text-black whitespace-pre-line"
          style={{ fontSize: 28, lineHeight: 1.30, letterSpacing: "-0.0054em" }}
        >
          {formStep === 1 && "달성하고 싶은\n목표를 알려주세요"}
          {formStep === 2 && "기본 정보를\n입력해 주세요"}
          {formStep === 3 && "러닝 정보를\n입력해 주세요"}
        </h1>
        {formStep === 3 && (
          <p
            className="font-medium text-[#5E6368] mt-2"
            style={{ fontSize: 14, lineHeight: "1.40" }}
          >
            AI 코치가 분석 후 훈련 계획을 알려줘요.
          </p>
        )}
      </div>

      {/* Step content: px:20px, scrollable */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Step 1: 목표 ── */}
        {formStep === 1 && (
          <div className="px-6 pb-4 flex flex-col gap-5">

            {/* 대회 일시: height 52px, padding 14/16px, radius 18px, full width */}
            <div>
              <FieldLabel label="대회 일시" />
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>

                <PopoverTrigger
                  className="border border-[rgba(60,60,67,0.29)] rounded-[18px] flex items-center justify-between cursor-pointer"
                  style={{ width: 272, height: 52, paddingLeft: 16, paddingRight: 16 }}
                >
                  <span
                    className="font-medium"
                    style={{
                      fontSize: 16,
                      color: form.raceDate ? "#000000" : "rgba(60,60,67,0.29)",
                    }}
                  >
                    {form.raceDate
                      ? (() => {
                          const d = new Date(form.raceDate);
                          return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                        })()
                      : "날짜 선택"}
                  </span>
                  <CalendarDays className="size-[18px] text-black" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.raceDate ? new Date(form.raceDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        setField("raceDate", `${y}-${m}-${d}`);
                      }
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < minDate || date > maxDate}
                  />
                </PopoverContent>
              </Popover>
              {step1Errors.raceDate && (
                <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step1Errors.raceDate}</p>
              )}
            </div>

            {/* 참가 코스: chip size=s, gap 8px */}
            <div>
              <FieldLabel label="참가 코스" />
              <div className="flex gap-2">
                {RACE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={form.raceType === opt.value}
                    onClick={() => setField("raceType", opt.value)}
                    flex
                    size="s"
                  />
                ))}
              </div>
              {step1Errors.raceType && (
                <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step1Errors.raceType}</p>
              )}
            </div>

            {/* 목표 기록: gap 6px between all items */}
            <div>
              <FieldLabel label="목표 기록" />
              <div className="flex items-center gap-[6px]">
                <NumBox
                  value={form.goalHours}
                  onChange={(v) => setField("goalHours", v)}
                  min={0}
                  max={9}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>시간</span>
                <NumBox
                  value={form.goalMinutes}
                  onChange={(v) => setField("goalMinutes", v)}
                  min={0}
                  max={59}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
              </div>
              {step1Errors.goalTime && (
                <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step1Errors.goalTime}</p>
              )}
            </div>

            {/* PB: 코스명 파란색 레이블, gap 6px between all items */}
            <div>
              <div className="flex items-end gap-[2px] pb-1">
                <span className="font-medium text-[#0088FF]" style={{ fontSize: 15, lineHeight: "1.45" }}>{pbLabel}</span>
                <span className="font-medium text-black" style={{ fontSize: 15, lineHeight: "1.45" }}>최고 기록</span>
                <span className="font-medium text-[#727272]" style={{ fontSize: 15, lineHeight: "1.45" }}>(선택)</span>
              </div>
              <div className="flex items-center gap-[6px]">
                <NumBox
                  value={form.pbHours}
                  onChange={(v) => setField("pbHours", v)}
                  min={0}
                  max={9}
                  disabled={form.noPb}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>시간</span>
                <NumBox
                  value={form.pbMinutes}
                  onChange={(v) => setField("pbMinutes", v)}
                  min={0}
                  max={59}
                  disabled={form.noPb}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
                <NumBox
                  value={form.pbSeconds}
                  onChange={(v) => setField("pbSeconds", v)}
                  min={0}
                  max={59}
                  disabled={form.noPb}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>초</span>
              </div>
            </div>

          </div>
        )}

        {/* ── Step 2: 기본 정보 ── */}
        {formStep === 2 && (
          <div className="px-5 pb-4 flex flex-col gap-5">

            {/* 성별: chip size=m, gap 16px */}
            <div>
              <FieldLabel label="성별" required />
              <div className="flex gap-4">
                <Chip
                  label="남자"
                  selected={form.gender === "male"}
                  onClick={() => setField("gender", "male")}
                  flex
                  size="m"
                />
                <Chip
                  label="여자"
                  selected={form.gender === "female"}
                  onClick={() => setField("gender", "female")}
                  flex
                  size="m"
                />
              </div>
            </div>

            {/* 나이: gap 6px */}
            <div>
              <FieldLabel label="나이" required />
              <div className="flex items-center gap-[6px]">
                <NumBox
                  value={form.age}
                  onChange={(v) => { setField("age", v); setStep2Errors((e) => ({ ...e, age: undefined })); }}
                  min={10}
                  max={99}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>세</span>
              </div>
              {step2Errors.age && (
                <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step2Errors.age}</p>
              )}
            </div>

            {/* 러닝 경력: gap 6px */}
            <div>
              <FieldLabel label="러닝 경력" required />
              <div className="flex items-center gap-[6px]">
                <NumBox
                  value={form.expYears}
                  onChange={(v) => setField("expYears", v)}
                  min={0}
                  max={50}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>년</span>
                <NumBox
                  value={form.expMonths}
                  onChange={(v) => setField("expMonths", v)}
                  min={0}
                  max={11}
                />
                <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>개월</span>
              </div>
            </div>

          </div>
        )}

        {/* ── Step 3: 러닝 정보 ── sections gap 40px, fields gap 20px */}
        {formStep === 3 && (
          <div className="px-5 pb-4 flex flex-col gap-[40px]">

            {/* 마일리지 섹션 */}
            <div className="flex flex-col gap-[10px]">
              <SectionTitle title="마일리지" />
              <div className="flex flex-col gap-5">

                <div>
                  <FieldLabel label="최근 1주" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox
                      value={form.weeklyMileage1}
                      onChange={(v) => setField("weeklyMileage1", v)}
                      min={0}
                      wide
                    />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
                  </div>
                </div>

                <div>
                  <FieldLabel label="최근 1달" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox
                      value={form.weeklyMileage4}
                      onChange={(v) => setField("weeklyMileage4", v)}
                      min={0}
                      wide
                    />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
                  </div>
                </div>

                <div>
                  <FieldLabel label="최근 LSD" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox
                      value={form.maxRunDistance}
                      onChange={(v) => setField("maxRunDistance", v)}
                      min={0}
                      wide
                    />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
                  </div>
                </div>

                {/* 훈련 가능 요일: chip size=s, gap 8px */}
                <div>
                  <div className="flex items-end justify-between pb-1">
                    <span className="font-medium text-black" style={{ fontSize: 15, lineHeight: "1.45" }}>
                      훈련 가능 요일
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllDays}
                      className="font-medium text-[#0088FF]"
                      style={{ fontSize: 13 }}
                    >
                      {form.trainingDays.length === 7 ? "전체 해제" : "모두 선택"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => { toggleDay(d.value); setStep3Errors((e) => ({ ...e, trainingDays: undefined })); }}
                        className={cn(
                          "flex-1 rounded-full border font-semibold transition-colors py-1.5 text-[14px]",
                          form.trainingDays.includes(d.value)
                            ? "border-[#0088FF] text-[#0088FF]"
                            : "border-[#5E6368] text-black"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {step3Errors.trainingDays && (
                    <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step3Errors.trainingDays}</p>
                  )}
                </div>

              </div>
            </div>

            {/* 조깅 섹션 */}
            <div className="flex flex-col gap-[10px]">
              <SectionTitle title="조깅" sub="평소 조깅 1회 기준으로 입력해 주세요." />
              <div className="flex flex-col gap-5">

                <div>
                  <FieldLabel label="거리" sub="(km)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox value={form.joggingDist} onChange={(v) => setField("joggingDist", v)} min={0} wide />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
                  </div>
                </div>

                <div>
                  <FieldLabel label="페이스" sub="(min/km)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox value={form.joggingPaceMin} onChange={(v) => setField("joggingPaceMin", v)} min={3} max={20} />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
                    <NumBox value={form.joggingPaceSec} onChange={(v) => setField("joggingPaceSec", v)} min={0} max={59} />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>초</span>
                  </div>
                </div>

                <div>
                  <FieldLabel label="심박" sub="(bpm)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox value={form.joggingHr} onChange={(v) => { setField("joggingHr", v); setStep3Errors((e) => ({ ...e, joggingHr: undefined })); }} min={60} max={200} wide />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>bpm</span>
                  </div>
                  {step3Errors.joggingHr && (
                    <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step3Errors.joggingHr}</p>
                  )}
                </div>

                <div>
                  <FieldLabel label="케이던스" sub="(선택, spm)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox
                      value={form.joggingCadence ?? 0}
                      onChange={(v) => setField("joggingCadence", v || null)}
                      min={100}
                      max={220}
                      wide
                    />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>spm</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 러닝 섹션 */}
            <div className="flex flex-col gap-[10px] pb-2">
              <SectionTitle title="러닝" sub="평소 러닝 1회 기준으로 입력해 주세요." />
              <div className="flex flex-col gap-5">

                <div>
                  <FieldLabel label="거리" sub="(km)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox value={form.runningDist} onChange={(v) => setField("runningDist", v)} min={0} wide />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
                  </div>
                </div>

                <div>
                  <FieldLabel label="페이스" sub="(min/km)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox value={form.runningPaceMin} onChange={(v) => setField("runningPaceMin", v)} min={3} max={20} />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
                    <NumBox value={form.runningPaceSec} onChange={(v) => setField("runningPaceSec", v)} min={0} max={59} />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>초</span>
                  </div>
                </div>

                <div>
                  <FieldLabel label="심박" sub="(bpm)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox value={form.runningHr} onChange={(v) => { setField("runningHr", v); setStep3Errors((e) => ({ ...e, runningHr: undefined })); }} min={60} max={220} wide />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>bpm</span>
                  </div>
                  {step3Errors.runningHr && (
                    <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step3Errors.runningHr}</p>
                  )}
                </div>

                <div>
                  <FieldLabel label="케이던스" sub="(선택, spm)" />
                  <div className="flex items-center gap-[6px]">
                    <NumBox
                      value={form.runningCadence ?? 0}
                      onChange={(v) => setField("runningCadence", v || null)}
                      min={100}
                      max={220}
                      wide
                    />
                    <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>spm</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* CTA Button: padding 20px, button radius 12px, padding 16/24px, text 18px/600 */}
      <div className="py-5 shrink-0">
        {error && (
          <p className="text-[#FC6C6C] mb-3 text-center" style={{ fontSize: 13 }}>{error}</p>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={formStep === 3 && isSubmitting}
          className="w-[320px] bg-[#0088FF] text-white rounded-xl font-semibold active:opacity-90 transition-opacity disabled:opacity-50"
          style={{ paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, fontSize: 18, lineHeight: "1.40", borderRadius: 12 }}
        >
          다음
        </button>
      </div>

    </main>

    {/* 초대코드 토스트 */}
    {toast && (
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#222324",
          color: "#FFFFFF",
          borderRadius: 999,
          padding: "14px 24px",
          width: 320,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 500,
          boxShadow: "0px 4px 10px 0px rgba(11, 12, 12, 0.16)",
          zIndex: 100,
          boxSizing: "border-box" as const,
        }}
      >
        {toast}
      </div>
    )}
    </>
  );
}
