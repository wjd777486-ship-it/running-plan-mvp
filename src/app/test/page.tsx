"use client";

import { useState } from "react";
import type { RunnerFormData, ValidationResult, GeneratedPlan, GeneratedWeek } from "@/lib/types";

// 오늘부터 N주 후 날짜
function weeksFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split("T")[0];
}

const TEST_CASES: { label: string; desc: string; data: RunnerFormData }[] = [
  {
    label: "케이스 1: GREEN / 하프 / 충분한 기간",
    desc: "경력 3년, 하프 PB 2:05, 목표 1:55, 16주",
    data: {
      raceType: "half", raceDate: weeksFromNow(16),
      goalHours: 1, goalMinutes: 55,
      pbHours: 2, pbMinutes: 5, pbSeconds: 0, noPb: false,
      gender: "male", age: 35, expYears: 3, expMonths: 0,
      weeklyMileage1: 45, weeklyMileage4: 160,
      maxRunDistance: 18, trainingDays: ["mon","wed","thu","sat","sun"],
      joggingDist: 8, joggingPaceMin: 6, joggingPaceSec: 20, joggingHr: 128, joggingCadence: null,
      runningDist: 10, runningPaceMin: 5, runningPaceSec: 30, runningHr: 155, runningCadence: null,
    },
  },
  {
    label: "케이스 2: YELLOW / 풀 / 기간 부족",
    desc: "경력 2년, 풀 PB 없음, 목표 4:30, 10주",
    data: {
      raceType: "full", raceDate: weeksFromNow(10),
      goalHours: 4, goalMinutes: 30,
      pbHours: 0, pbMinutes: 0, pbSeconds: 0, noPb: true,
      gender: "female", age: 40, expYears: 2, expMonths: 0,
      weeklyMileage1: 30, weeklyMileage4: 110,
      maxRunDistance: 18, trainingDays: ["tue","thu","sat","sun"],
      joggingDist: 6, joggingPaceMin: 7, joggingPaceSec: 0, joggingHr: 132, joggingCadence: null,
      runningDist: 8, runningPaceMin: 6, runningPaceSec: 10, runningHr: 158, runningCadence: null,
    },
  },
  {
    label: "케이스 3: RED / 풀 / 목표 비현실적",
    desc: "경력 6개월, 목표 서브3, 12주",
    data: {
      raceType: "full", raceDate: weeksFromNow(12),
      goalHours: 2, goalMinutes: 55,
      pbHours: 0, pbMinutes: 0, pbSeconds: 0, noPb: true,
      gender: "male", age: 28, expYears: 0, expMonths: 6,
      weeklyMileage1: 20, weeklyMileage4: 70,
      maxRunDistance: 10, trainingDays: ["mon","wed","fri","sun"],
      joggingDist: 5, joggingPaceMin: 7, joggingPaceSec: 30, joggingHr: 138, joggingCadence: null,
      runningDist: 5, runningPaceMin: 6, runningPaceSec: 40, runningHr: 162, runningCadence: null,
    },
  },
  {
    label: "케이스 4: GREEN / 10K / 단기",
    desc: "경력 1년, 10K PB 58분, 목표 55분, 8주",
    data: {
      raceType: "10k", raceDate: weeksFromNow(8),
      goalHours: 0, goalMinutes: 55,
      pbHours: 0, pbMinutes: 58, pbSeconds: 0, noPb: false,
      gender: "male", age: 30, expYears: 1, expMonths: 0,
      weeklyMileage1: 35, weeklyMileage4: 130,
      maxRunDistance: 14, trainingDays: ["mon","wed","fri","sat"],
      joggingDist: 7, joggingPaceMin: 6, joggingPaceSec: 0, joggingHr: 130, joggingCadence: null,
      runningDist: 8, runningPaceMin: 5, runningPaceSec: 20, runningHr: 160, runningCadence: null,
    },
  },
  {
    label: "케이스 5: YELLOW / 하프 / LSD 부족",
    desc: "경력 1년, 하프 PB 없음, 목표 2:20, 12주, LSD 10km",
    data: {
      raceType: "half", raceDate: weeksFromNow(12),
      goalHours: 2, goalMinutes: 20,
      pbHours: 0, pbMinutes: 0, pbSeconds: 0, noPb: true,
      gender: "female", age: 33, expYears: 1, expMonths: 0,
      weeklyMileage1: 25, weeklyMileage4: 90,
      maxRunDistance: 10, trainingDays: ["tue","thu","sat","sun"],
      joggingDist: 5, joggingPaceMin: 7, joggingPaceSec: 30, joggingHr: 135, joggingCadence: null,
      runningDist: 6, runningPaceMin: 6, runningPaceSec: 30, runningHr: 160, runningCadence: null,
    },
  },
  {
    label: "케이스 6: GREEN / 풀 / 엘리트",
    desc: "경력 8년, 풀 PB 3:15, 목표 3:05, 20주",
    data: {
      raceType: "full", raceDate: weeksFromNow(20),
      goalHours: 3, goalMinutes: 5,
      pbHours: 3, pbMinutes: 15, pbSeconds: 0, noPb: false,
      gender: "male", age: 38, expYears: 8, expMonths: 0,
      weeklyMileage1: 70, weeklyMileage4: 260,
      maxRunDistance: 30, trainingDays: ["mon","tue","wed","thu","fri","sat"],
      joggingDist: 12, joggingPaceMin: 5, joggingPaceSec: 30, joggingHr: 125, joggingCadence: null,
      runningDist: 15, runningPaceMin: 4, runningPaceSec: 30, runningHr: 158, runningCadence: null,
    },
  },
  {
    label: "케이스 7: RED / 하프 / 훈련일 부족",
    desc: "경력 6개월, 주 2일만 가능, 목표 1:50, 8주",
    data: {
      raceType: "half", raceDate: weeksFromNow(8),
      goalHours: 1, goalMinutes: 50,
      pbHours: 0, pbMinutes: 0, pbSeconds: 0, noPb: true,
      gender: "female", age: 45, expYears: 0, expMonths: 6,
      weeklyMileage1: 15, weeklyMileage4: 50,
      maxRunDistance: 8, trainingDays: ["wed","sat"],
      joggingDist: 4, joggingPaceMin: 7, joggingPaceSec: 50, joggingHr: 140, joggingCadence: null,
      runningDist: 4, runningPaceMin: 7, runningPaceSec: 0, runningHr: 165, runningCadence: null,
    },
  },
  {
    label: "케이스 8: GREEN / 5K / 초단기",
    desc: "경력 2년, 5K PB 28분, 목표 26분, 6주",
    data: {
      raceType: "5k", raceDate: weeksFromNow(6),
      goalHours: 0, goalMinutes: 26,
      pbHours: 0, pbMinutes: 28, pbSeconds: 0, noPb: false,
      gender: "male", age: 25, expYears: 2, expMonths: 0,
      weeklyMileage1: 40, weeklyMileage4: 150,
      maxRunDistance: 12, trainingDays: ["mon","tue","thu","fri","sat"],
      joggingDist: 8, joggingPaceMin: 5, joggingPaceSec: 50, joggingHr: 128, joggingCadence: null,
      runningDist: 8, runningPaceMin: 5, runningPaceSec: 0, runningHr: 162, runningCadence: null,
    },
  },
  {
    label: "케이스 9: YELLOW / 풀 / 볼륨 낮음",
    desc: "경력 3년, 풀 PB 4:10, 목표 3:50, 18주, 주간 25km",
    data: {
      raceType: "full", raceDate: weeksFromNow(18),
      goalHours: 3, goalMinutes: 50,
      pbHours: 4, pbMinutes: 10, pbSeconds: 0, noPb: false,
      gender: "male", age: 42, expYears: 3, expMonths: 0,
      weeklyMileage1: 25, weeklyMileage4: 95,
      maxRunDistance: 20, trainingDays: ["mon","wed","fri","sun"],
      joggingDist: 7, joggingPaceMin: 6, joggingPaceSec: 40, joggingHr: 130, joggingCadence: null,
      runningDist: 8, runningPaceMin: 5, runningPaceSec: 45, runningHr: 158, runningCadence: null,
    },
  },
  {
    label: "케이스 10: YELLOW / 하프 / 중급자",
    desc: "경력 2년, 하프 PB 2:15, 목표 2:05, 14주",
    data: {
      raceType: "half", raceDate: weeksFromNow(14),
      goalHours: 2, goalMinutes: 5,
      pbHours: 2, pbMinutes: 15, pbSeconds: 0, noPb: false,
      gender: "female", age: 36, expYears: 2, expMonths: 0,
      weeklyMileage1: 38, weeklyMileage4: 140,
      maxRunDistance: 16, trainingDays: ["mon","wed","thu","sat","sun"],
      joggingDist: 8, joggingPaceMin: 6, joggingPaceSec: 50, joggingHr: 130, joggingCadence: null,
      runningDist: 10, runningPaceMin: 5, runningPaceSec: 55, runningHr: 157, runningCadence: null,
    },
  },
];

interface IssueFlag {
  type: string;
  detail: string;
  severity: "error" | "warn";
}

function detectIssues(plan: GeneratedPlan, formData: RunnerFormData): IssueFlag[] {
  const issues: IssueFlag[] = [];
  const weeks = plan.weekly_plans;
  if (!weeks || weeks.length === 0) return issues;

  const raceDate = formData.raceDate;
  const totalWeeks = weeks.length;

  // 1. 테이퍼 볼륨 미감소 검사
  const peakVol = Math.max(...weeks.map((w) => w.total_distance_km));
  const lastTwoWeeks = weeks.slice(-2);
  for (const w of lastTwoWeeks) {
    if (w.total_distance_km > peakVol * 0.75) {
      issues.push({
        type: "테이퍼 볼륨",
        detail: `${w.week}주차 볼륨 ${w.total_distance_km}km — 피크(${peakVol}km)의 75% 초과`,
        severity: "error",
      });
    }
  }

  // 2. LSD 주간 2km 초과 증가 검사 + 절댓값 하한 검사
  const lsdMinKm = formData.weeklyMileage1 * 0.2;
  let prevLsd = 0;
  for (let wi = 0; wi < weeks.length; wi++) {
    const w = weeks[wi];
    const lsdDay = w.days.find((d) => d.session_type === "lsd");
    if (lsdDay && lsdDay.distance_km > 0) {
      if (prevLsd > 0 && lsdDay.distance_km - prevLsd > 2.1) {
        // 직전 주가 회복주(볼륨 20% 이상 감소)이면 LSD 점프는 정상 패턴 → 스킵
        const prevVol = wi > 0 ? weeks[wi - 1].total_distance_km : 0;
        const prevPrevVol = wi > 1 ? weeks[wi - 2].total_distance_km : 0;
        const prevWasRecovery = prevPrevVol > 0 && prevVol < prevPrevVol * 0.85;
        if (!prevWasRecovery) {
          issues.push({
            type: "LSD 점프",
            detail: `${w.week}주차 LSD ${lsdDay.distance_km}km (전주 ${prevLsd}km, +${(lsdDay.distance_km - prevLsd).toFixed(1)}km)`,
            severity: "warn",
          });
        }
      }
      if (lsdDay.distance_km < lsdMinKm) {
        issues.push({
          type: "LSD 하한 미달",
          detail: `${w.week}주차 LSD ${lsdDay.distance_km}km < 기준 ${lsdMinKm.toFixed(1)}km (weeklyMileage1 × 0.2)`,
          severity: "warn",
        });
      }
      prevLsd = lsdDay.distance_km;
    }
  }

  // 3. 주간 볼륨 10% 초과 증가 검사 (회복주 다음 주는 예외)
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1].total_distance_km;
    const curr = weeks[i].total_distance_km;
    if (prev > 0 && curr > prev * 1.11) {
      const prevPrev = i > 1 ? weeks[i - 2].total_distance_km : 0;
      const prevWasRecovery = prevPrev > 0 && prev < prevPrev * 0.85;
      if (!prevWasRecovery) {
        issues.push({
          type: "볼륨 점프",
          detail: `${weeks[i].week}주차 ${curr}km → 전주(${prev}km) 대비 ${((curr / prev - 1) * 100).toFixed(0)}% 증가`,
          severity: "warn",
        });
      }
    }
  }

  // 4. 인터벌 세션 0회 검사 (테이퍼 2주 제외)
  const mainWeeks = weeks.slice(0, Math.max(1, totalWeeks - 2));
  const intervalCount = mainWeeks.reduce(
    (acc, w) => acc + w.days.filter((d) => d.session_type === "interval").length,
    0
  );
  if (intervalCount === 0 && totalWeeks >= 4) {
    issues.push({
      type: "인터벌 0회",
      detail: `테이퍼 제외 ${mainWeeks.length}주 동안 인터벌 없음`,
      severity: "error",
    });
  }

  // 5. 대회 전날 rest 검사
  const raceDateObj = new Date(raceDate + "T00:00:00");
  raceDateObj.setDate(raceDateObj.getDate() - 1);
  const preRaceDay = raceDateObj.toISOString().split("T")[0];
  for (const w of weeks) {
    const day = w.days.find((d) => d.date === preRaceDay);
    if (day && !day.is_rest && day.session_type !== "rest") {
      issues.push({
        type: "대회 전날 비rest",
        detail: `${preRaceDay} session_type=${day.session_type}`,
        severity: "error",
      });
    }
  }

  // 6. 대회 당일 race 세션 검사
  let hasRaceDay = false;
  for (const w of weeks) {
    if (w.days.find((d) => d.date === raceDate && d.session_type === "race")) {
      hasRaceDay = true;
    }
  }
  if (!hasRaceDay) {
    issues.push({
      type: "대회 당일 race 없음",
      detail: `${raceDate}에 session_type=race 세션 없음`,
      severity: "warn",
    });
  }

  // 7. 훈련 가능 요일 위반 검사 (race 세션은 대회 당일이라 제외)
  const dayMap: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
  const allowedDows = new Set(formData.trainingDays.map((d) => dayMap[d]));
  for (const w of weeks) {
    for (const d of w.days) {
      if (d.is_rest || d.session_type === "rest") continue;
      if (d.session_type === "race") continue; // 대회 당일은 요일 무관
      const dow = new Date(d.date + "T00:00:00").getDay();
      if (!allowedDows.has(dow)) {
        issues.push({
          type: "요일 위반",
          detail: `${d.date} (${d.session_type}) — 훈련 불가 요일`,
          severity: "error",
        });
      }
    }
  }

  return issues;
}

interface CaseResult {
  caseIdx: number;
  status: "idle" | "validating" | "generating" | "done" | "error";
  validation: ValidationResult | null;
  plan: GeneratedPlan | null;
  issues: IssueFlag[];
  error: string | null;
  intervalCount: number;
  lsdMax: number;
  weeklyVols: number[];
  expanded: boolean;
}

export default function TestPage() {
  const [results, setResults] = useState<CaseResult[]>(
    TEST_CASES.map((_, i) => ({
      caseIdx: i,
      status: "idle",
      validation: null,
      plan: null,
      issues: [],
      error: null,
      intervalCount: 0,
      lsdMax: 0,
      weeklyVols: [],
      expanded: false,
    }))
  );
  const [running, setRunning] = useState(false);

  function updateResult(idx: number, patch: Partial<CaseResult>) {
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function runCase(idx: number) {
    const tc = TEST_CASES[idx];
    updateResult(idx, { status: "validating", error: null, plan: null, issues: [], validation: null });

    let validation: ValidationResult;
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tc.data),
      });
      if (!res.ok) throw new Error(`validate ${res.status}`);
      validation = await res.json();
      updateResult(idx, { validation, status: "generating" });
    } catch (e) {
      updateResult(idx, { status: "error", error: String(e) });
      return;
    }

    try {
      const res = await fetch("/api/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: tc.data, validation, useAiGoal: false }),
      });
      if (!res.ok) throw new Error(`generate ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      if (raw.includes("__ERROR__:")) {
        throw new Error(raw.split("__ERROR__:")[1]);
      }

      // v2: 날짜 배정된 최종 플랜은 __PLAN_WITH_DATES__ 트레일러에 포함
      let plan: GeneratedPlan;
      const planMarker = "__PLAN_WITH_DATES__:";
      if (raw.includes(planMarker)) {
        const planJson = raw.split(planMarker)[1];
        plan = JSON.parse(planJson);
      } else {
        throw new Error("v2 응답에 __PLAN_WITH_DATES__ 없음");
      }

      const issues = detectIssues(plan, tc.data);
      const intervalCount = plan.weekly_plans.reduce(
        (acc, w) => acc + w.days.filter((d) => d.session_type === "interval").length,
        0
      );
      const lsdDays = plan.weekly_plans.flatMap((w) =>
        w.days.filter((d) => d.session_type === "lsd")
      );
      const lsdMax = lsdDays.length > 0 ? Math.max(...lsdDays.map((d) => d.distance_km)) : 0;
      const weeklyVols = plan.weekly_plans.map((w) => w.total_distance_km);

      updateResult(idx, { status: "done", plan, issues, intervalCount, lsdMax, weeklyVols });
    } catch (e) {
      updateResult(idx, { status: "error", error: String(e) });
    }
  }

  async function runAll() {
    setRunning(true);
    for (let i = 0; i < TEST_CASES.length; i++) {
      await runCase(i);
    }
    setRunning(false);
  }

  const doneCount = results.filter((r) => r.status === "done").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const totalIssues = results.reduce((acc, r) => acc + r.issues.length, 0);

  return (
    <div style={{ fontFamily: "monospace", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>훈련 플랜 테스트</h1>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={runAll}
          disabled={running}
          style={{
            padding: "8px 20px", background: running ? "#ccc" : "#0A0A0A",
            color: "#fff", border: "none", borderRadius: 8, cursor: running ? "default" : "pointer",
            fontFamily: "monospace", fontSize: 14,
          }}
        >
          {running ? "실행 중..." : "전체 실행"}
        </button>
        <span style={{ fontSize: 13, color: "#555" }}>
          완료 {doneCount}/{TEST_CASES.length} | 오류 {errorCount} | 이슈 {totalIssues}개
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TEST_CASES.map((tc, idx) => {
          const r = results[idx];
          const statusColor =
            r.status === "done" ? (r.issues.filter(i=>i.severity==="error").length > 0 ? "#dc2626" : "#16a34a")
            : r.status === "error" ? "#dc2626"
            : r.status === "idle" ? "#6b7280"
            : "#d97706";

          return (
            <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{tc.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{tc.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>
                    {r.status === "idle" ? "대기"
                      : r.status === "validating" ? "검증 중..."
                      : r.status === "generating" ? "생성 중..."
                      : r.status === "done" ? "완료"
                      : "오류"}
                  </span>
                  <button
                    onClick={() => runCase(idx)}
                    disabled={r.status === "validating" || r.status === "generating"}
                    style={{
                      padding: "4px 10px", fontSize: 12, border: "1px solid #d1d5db",
                      borderRadius: 6, background: "#f9fafb", cursor: "pointer", fontFamily: "monospace",
                    }}
                  >
                    실행
                  </button>
                </div>
              </div>

              {r.validation && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#374151" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, marginRight: 8,
                    background: r.validation.validation.status === "GREEN" ? "#dcfce7"
                      : r.validation.validation.status === "YELLOW" ? "#fef9c3" : "#fee2e2",
                    color: r.validation.validation.status === "GREEN" ? "#166534"
                      : r.validation.validation.status === "YELLOW" ? "#854d0e" : "#991b1b",
                  }}>
                    {r.validation.validation.status}
                  </span>
                  VDOT {r.validation.validation.vdot.estimated_current} → {r.validation.validation.vdot.required_for_goal}
                  {" "}(gap {r.validation.validation.vdot.gap}, {r.validation.validation.vdot.judgment})
                  {" | "}기간 {r.validation.validation.training_period.total_weeks}주 ({r.validation.validation.training_period.judgment})
                  {" | "}LSD {r.validation.validation.max_run_distance.current_max_km}km ({r.validation.validation.max_run_distance.judgment})
                </div>
              )}

              {r.status === "done" && r.plan && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <div style={{ color: "#374151", marginBottom: 4 }}>
                    총 {r.plan.weekly_plans.length}주 | 인터벌 {r.intervalCount}회 | LSD 최대 {r.lsdMax}km
                    {" | "}주간볼륨: [{r.weeklyVols.map(v => Math.round(v)).join(", ")}]
                  </div>
                  {r.issues.length === 0 ? (
                    <div style={{ color: "#16a34a", fontWeight: 600 }}>✓ 이슈 없음</div>
                  ) : (
                    <div>
                      {r.issues.map((issue, ii) => (
                        <div key={ii} style={{
                          color: issue.severity === "error" ? "#dc2626" : "#d97706",
                          marginBottom: 2,
                        }}>
                          {issue.severity === "error" ? "✗" : "△"} [{issue.type}] {issue.detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {r.status === "done" && r.plan && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => updateResult(idx, { expanded: !r.expanded })}
                    style={{
                      fontSize: 11, padding: "2px 8px", border: "1px solid #d1d5db",
                      borderRadius: 4, background: "#f9fafb", cursor: "pointer", fontFamily: "monospace",
                    }}
                  >
                    {r.expanded ? "▲ 접기" : "▼ 상세 보기"}
                  </button>

                  {r.expanded && (
                    <div style={{ marginTop: 10 }}>
                      {/* 유저 입력값 */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                        [유저 입력값]
                      </div>
                      <pre style={{
                        fontSize: 10, background: "#f3f4f6", padding: 8, borderRadius: 6,
                        overflowX: "auto", marginBottom: 12, lineHeight: 1.5,
                      }}>
                        {JSON.stringify(tc.data, null, 2)}
                      </pre>

                      {/* 일별 세션 */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                        [일별 세션]
                      </div>
                      <div style={{
                        fontSize: 11, background: "#f3f4f6", padding: 8, borderRadius: 6,
                        fontFamily: "monospace", lineHeight: 1.8,
                      }}>
                        {r.plan.weekly_plans.map((w) => (
                          <div key={w.week}>
                            <div style={{ fontWeight: 700, color: "#6b7280", marginTop: 4 }}>
                              ── {w.week}주차 ({w.total_distance_km}km) ──
                            </div>
                            {w.days.map((d) => (
                              <div key={d.date} style={{
                                color: d.is_rest || d.session_type === "rest" ? "#9ca3af"
                                  : d.session_type === "interval" ? "#7c3aed"
                                  : d.session_type === "tempo" ? "#b45309"
                                  : d.session_type === "lsd" ? "#0369a1"
                                  : d.session_type === "race" ? "#dc2626"
                                  : "#374151",
                              }}>
                                {d.date} | {d.session_type.padEnd(8)} | {d.distance_km ?? 0}km | {d.pace_target || "-"}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {r.status === "error" && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>
                  오류: {r.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
