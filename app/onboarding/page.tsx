"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/app/actions/plan";
import { getOrCreateAnonymousUserId } from "@/lib/anonymous-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { RunnerFormData, RaceType, ValidationResult, GeneratedPlan } from "@/lib/types";

// ── Initial state ─────────────────────────────────────────────────────────────

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
  age: 30,
  expYears: 0,
  expMonths: 0,
  weeklyMileage1: 0,
  weeklyMileage4: 0,
  maxRunDistance: 0,
  trainingDays: [],
  joggingDist: 0,
  joggingPaceMin: 6,
  joggingPaceSec: 0,
  joggingHr: 130,
  joggingCadence: null,
  runningDist: 0,
  runningPaceMin: 5,
  runningPaceSec: 0,
  runningHr: 155,
  runningCadence: null,
};

const RACE_TYPES = [
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half", label: "하프마라톤 (21.1km)" },
  { value: "full", label: "풀마라톤 (42.2km)" },
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

type Step = "form" | "validating" | "result";

// ── Validation result display ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  GREEN: "text-emerald-600 bg-emerald-50 border-emerald-200",
  YELLOW: "text-yellow-700 bg-yellow-50 border-yellow-200",
  RED: "text-red-600 bg-red-50 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  GREEN: "달성 가능",
  YELLOW: "도전적",
  RED: "재검토 필요",
};

const JUDGMENT_ICON: Record<string, string> = {
  PASS: "✅",
  WARN: "⚠️",
  FAIL: "❌",
};

function ValidationDisplay({
  result,
  onProceed,
  onBack,
  isGenerating,
  generateProgress,
}: {
  result: ValidationResult;
  onProceed: () => void;
  onBack: () => void;
  isGenerating: boolean;
  generateProgress: string;
}) {
  const { validation } = result;

  return (
    <div className="space-y-4">
      {/* Overall status */}
      <div className={`rounded-lg border p-4 ${STATUS_STYLE[validation.status]}`}>
        <p className="font-bold text-lg">{STATUS_LABEL[validation.status]}</p>
        {validation.realistic_goal.suggested_time && (
          <p className="text-sm mt-1">
            현실적 목표: <strong>{validation.realistic_goal.suggested_time}</strong>
          </p>
        )}
        {validation.realistic_goal.message && (
          <p className="text-sm mt-1">{validation.realistic_goal.message}</p>
        )}
      </div>

      {/* Detail checks */}
      <div className="space-y-2">
        <div className="rounded-lg border bg-card p-3 text-sm space-y-0.5">
          <p className="font-medium">
            {JUDGMENT_ICON[validation.vdot.judgment]} VDOT 분석
          </p>
          <p className="text-muted-foreground">{validation.vdot.message}</p>
          <p className="text-xs text-muted-foreground">
            현재 VDOT {validation.vdot.estimated_current} → 목표 VDOT {validation.vdot.required_for_goal} (차이 {validation.vdot.gap})
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3 text-sm space-y-0.5">
          <p className="font-medium">
            {JUDGMENT_ICON[validation.training_period.judgment]} 훈련 기간
          </p>
          <p className="text-muted-foreground">{validation.training_period.message}</p>
          <p className="text-xs text-muted-foreground">
            총 {validation.training_period.total_weeks}주 가능 / 권장 {validation.training_period.weeks_needed_for_volume}주
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3 text-sm space-y-0.5">
          <p className="font-medium">
            {JUDGMENT_ICON[validation.max_run_distance.judgment]} 장거리 런
          </p>
          <p className="text-muted-foreground">{validation.max_run_distance.message}</p>
          <p className="text-xs text-muted-foreground">
            현재 최대 {validation.max_run_distance.current_max_km}km / 권장 {validation.max_run_distance.recommended_min_km}km
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={isGenerating}>
          수정하기
        </Button>
        <Button className="flex-1" onClick={onProceed} disabled={isGenerating}>
          {isGenerating ? generateProgress || "플랜 생성 중..." : "이 목표로 플랜 생성"}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<RunnerFormData>(INITIAL_FORM);
  const [step, setStep] = useState<Step>("form");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof RunnerFormData>(key: K, value: RunnerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTrainingDay(day: string) {
    setForm((prev) => {
      const days = prev.trainingDays.includes(day)
        ? prev.trainingDays.filter((d) => d !== day)
        : [...prev.trainingDays, day];
      return { ...prev, trainingDays: days };
    });
  }

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("validating");

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`검증 실패 (${res.status})`);
      const data: ValidationResult = await res.json();
      setValidationResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setStep("form");
    }
  }

  async function handleGenerate() {
    if (!validationResult) return;
    setIsGenerating(true);
    setGenerateProgress("AI 코치가 훈련 플랜을 작성하고 있어요...");
    setError(null);

    try {
      // 1. Stream plan generation
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: form, validation: validationResult }),
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

        // 에러 시그널 감지
        if (fullText.includes("__ERROR__:")) {
          const msg = fullText.split("__ERROR__:")[1].trim();
          throw new Error(msg);
        }

        // 진행 상황: "week": N 패턴으로 현재 몇 주차 생성 중인지 파악
        const weekMatches = fullText.match(/"week"\s*:\s*(\d+)/g);
        if (weekMatches) {
          const latest = weekMatches[weekMatches.length - 1].match(/\d+/)?.[0];
          if (latest) setGenerateProgress(`훈련 일정 생성 중... ${latest}주차`);
        }
      }

      setGenerateProgress("플랜 저장 중...");

      // 마크다운 코드블록 제거 후 JSON 파싱
      const cleaned = fullText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      const generatedPlan: GeneratedPlan = JSON.parse(cleaned);

      // 2. Save to Supabase
      const userId = getOrCreateAnonymousUserId();
      const result = await createPlan(form, generatedPlan, userId);
      if ("error" in result) throw new Error(result.error);

      router.push(`/plan?id=${result.planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setIsGenerating(false);
      setGenerateProgress("");
    }
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 84);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  // ── Result screen ─────────────────────────────────────────────────────────
  if (step === "result" && validationResult) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">목표 검증 결과</CardTitle>
            <CardDescription>AI 코치가 목표의 달성 가능성을 분석했어요.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <ValidationDisplay
              result={validationResult}
              onProceed={handleGenerate}
              onBack={() => setStep("form")}
              isGenerating={isGenerating}
              generateProgress={generateProgress}
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  // ── Form screen ───────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">러닝 플랜 시작하기</CardTitle>
          <CardDescription>
            정보를 입력하면 AI 코치가 D-day까지 맞춤 훈련 플랜을 만들어 드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleValidate} noValidate className="space-y-8">

            {/* ── Section 1: 목표 ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                목표
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>대회 종목</Label>
                  <Select
                    value={form.raceType}
                    onValueChange={(v) => v && setField("raceType", v as RaceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RACE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>대회 날짜</Label>
                  <Input
                    type="date"
                    min={minDateStr}
                    max={maxDateStr}
                    value={form.raceDate}
                    onChange={(e) => setField("raceDate", e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">목표 일정은 12주 이내로 설정해 주세요.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>목표 기록 <span className="text-muted-foreground font-normal text-sm">(선택)</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    placeholder="시간"
                    className="w-20"
                    value={form.goalHours || ""}
                    onChange={(e) => setField("goalHours", Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">h</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="분"
                    className="w-20"
                    value={form.goalMinutes || ""}
                    onChange={(e) => setField("goalMinutes", Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">min</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>개인 최고 기록 (PB)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    placeholder="시간"
                    className="w-20"
                    value={form.pbHours || ""}
                    onChange={(e) => setField("pbHours", Number(e.target.value))}
                    disabled={form.noPb}
                  />
                  <span className="text-muted-foreground">h</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="분"
                    className="w-20"
                    value={form.pbMinutes || ""}
                    onChange={(e) => setField("pbMinutes", Number(e.target.value))}
                    disabled={form.noPb}
                  />
                  <span className="text-muted-foreground">m</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="초"
                    className="w-20"
                    value={form.pbSeconds || ""}
                    onChange={(e) => setField("pbSeconds", Number(e.target.value))}
                    disabled={form.noPb}
                  />
                  <span className="text-muted-foreground">s</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    id="noPb"
                    type="checkbox"
                    checked={form.noPb}
                    onChange={(e) => setField("noPb", e.target.checked)}
                    className="size-4 cursor-pointer"
                  />
                  <Label htmlFor="noPb" className="font-normal text-sm cursor-pointer">기록 없음</Label>
                </div>
              </div>
            </section>

            {/* ── Section 2: 기본 정보 ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                기본 정보
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>성별</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) => v && setField("gender", v as "male" | "female")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">남성</SelectItem>
                      <SelectItem value="female">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>나이</Label>
                  <Input
                    type="number"
                    min={10}
                    max={99}
                    value={form.age || ""}
                    onChange={(e) => setField("age", Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>러닝 경력</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    placeholder="년"
                    className="w-24"
                    value={form.expYears || ""}
                    onChange={(e) => setField("expYears", Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">년</span>
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    placeholder="개월"
                    className="w-24"
                    value={form.expMonths || ""}
                    onChange={(e) => setField("expMonths", Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">개월</span>
                </div>
              </div>
            </section>

            {/* ── Section 3: 러닝 현황 ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                러닝 현황
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>최근 1주 주간 거리 (km)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.weeklyMileage1 || ""}
                    onChange={(e) => setField("weeklyMileage1", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>최근 4주 평균 주간 거리 (km)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.weeklyMileage4 || ""}
                    onChange={(e) => setField("weeklyMileage4", Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>최근 최대 장거리 런 (km)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.maxRunDistance || ""}
                  onChange={(e) => setField("maxRunDistance", Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>훈련 요일</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleTrainingDay(d.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        form.trainingDays.includes(d.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Section 4: 조깅 데이터 (HR < 140) ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                조깅 데이터 <span className="font-normal normal-case">(HR &lt; 140)</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>거리 (km)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.joggingDist || ""}
                    onChange={(e) => setField("joggingDist", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>심박수 (bpm)</Label>
                  <Input
                    type="number"
                    min={60}
                    max={200}
                    value={form.joggingHr || ""}
                    onChange={(e) => setField("joggingHr", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>페이스 (분:초 / km)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    placeholder="분"
                    className="w-20"
                    value={form.joggingPaceMin || ""}
                    onChange={(e) => setField("joggingPaceMin", Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="초"
                    className="w-20"
                    value={form.joggingPaceSec || ""}
                    onChange={(e) => setField("joggingPaceSec", Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">/km</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>케이던스 (spm) <span className="text-muted-foreground font-normal text-sm">(선택)</span></Label>
                <Input
                  type="number"
                  min={100}
                  max={220}
                  value={form.joggingCadence ?? ""}
                  onChange={(e) => setField("joggingCadence", e.target.value ? Number(e.target.value) : null)}
                  className="w-32"
                />
              </div>
            </section>

            {/* ── Section 5: 러닝 데이터 (HR >= 140) ── */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                러닝 데이터 <span className="font-normal normal-case">(HR ≥ 140)</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>거리 (km)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.runningDist || ""}
                    onChange={(e) => setField("runningDist", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>심박수 (bpm)</Label>
                  <Input
                    type="number"
                    min={60}
                    max={220}
                    value={form.runningHr || ""}
                    onChange={(e) => setField("runningHr", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>페이스 (분:초 / km)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    placeholder="분"
                    className="w-20"
                    value={form.runningPaceMin || ""}
                    onChange={(e) => setField("runningPaceMin", Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="초"
                    className="w-20"
                    value={form.runningPaceSec || ""}
                    onChange={(e) => setField("runningPaceSec", Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">/km</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>케이던스 (spm) <span className="text-muted-foreground font-normal text-sm">(선택)</span></Label>
                <Input
                  type="number"
                  min={100}
                  max={220}
                  value={form.runningCadence ?? ""}
                  onChange={(e) => setField("runningCadence", e.target.value ? Number(e.target.value) : null)}
                  className="w-32"
                />
              </div>
            </section>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={step === "validating"}>
              {step === "validating" ? "목표 검증 중..." : "목표 검증하기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
