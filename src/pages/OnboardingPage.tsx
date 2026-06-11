import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTossUserId } from "../lib/tossAuth";
import type { RunnerFormData, ValidationResult, GeneratedPlan } from "../lib/types";
import { trackEvent } from "../lib/analytics";
import { API_BASE_URL } from "../lib/apiBase";
import { createPlan } from "../lib/createPlan";
import { INITIAL_FORM, RACE_OPTIONS, DAYS_OF_WEEK } from "../components/onboarding/OnboardingCommon";
import { ValidationDisplay } from "../components/onboarding/ValidationDisplay";
import { OnboardingForm } from "../components/onboarding/OnboardingForm";
import { TossAdsBanner } from "../components/TossAdsBanner";

export default function OnboardingPage() {
  const navigate = useNavigate();
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
  const [calendarOpen, setCalendarOpen] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const savedPlanId = localStorage.getItem("plan_id");
    if (savedPlanId) {
      navigate(`/plan?id=${savedPlanId}`, { replace: true });
    }
  }, [navigate]);

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
      navigate(-1);
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

    setAppStep("validating");
    try {
      const res = await fetch(`${API_BASE_URL}/api/validate`, {
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
      const genRes = await fetch(`${API_BASE_URL}/api/generate-v2`, {
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
      const userId = await getTossUserId();
      const result = await createPlan(form, generatedPlan, userId);
      if ("error" in result) throw new Error(result.error);

      localStorage.setItem("plan_id", result.planId);
      navigate(`/plan?id=${result.planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setAppStep("result");
    }
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 84);

  const pbLabel = RACE_OPTIONS.find((r) => r.value === form.raceType)?.label ?? "코스";

  if (appStep === "validating" || appStep === "generating") {
    const mainText = appStep === "generating"
      ? `AI 러닝 코치가\n${generatingWeeks}주차 훈련 계획 짜는 중`
      : "AI 러닝 코치가\n훈련 계획을 짜고 있어요";
    const subText = appStep === "generating"
      ? "최대 1분 이상 걸릴 수 있어요."
      : "목표까지 남은 기간에 따라\n1분 이상 걸릴 수 있어요.";

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F5F5F9] px-5" style={{ paddingTop: 16 }}>
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

        {appStep === "generating" && (
          <>
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
            <TossAdsBanner />
          </>
        )}
      </main>
    );
  }

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

  return (
    <>
      <OnboardingForm
        formStep={formStep}
        form={form}
        setField={setField}
        step1Errors={step1Errors}
        step2Errors={step2Errors}
        step3Errors={step3Errors}
        setStep2Errors={setStep2Errors}
        setStep3Errors={setStep3Errors}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
        minDate={minDate}
        maxDate={maxDate}
        pbLabel={pbLabel}
        toggleDay={toggleDay}
        toggleAllDays={toggleAllDays}
        error={error}
        handleNext={handleNext}
        isSubmitting={isSubmitting}
      />

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
