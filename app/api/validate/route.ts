import Anthropic from "@anthropic-ai/sdk";
import type { RunnerFormData, ValidationResult } from "@/lib/types";

const client = new Anthropic();

const VALIDATE_PROMPT = `[역할]
너는 마라톤 훈련 전문 코치야.
오늘 날짜는 {today}야.

[검증 항목]
1. VDOT 달성 가능성
   - 현재 VDOT: {current_vdot} (서버 계산값, 재계산 금지. estimated_current에 그대로 사용)
   - 목표 VDOT: {goal_vdot} (서버 계산값, 재계산 금지. required_for_goal에 그대로 사용)
   - gap: {vdot_gap} (서버 계산값, 재계산 금지. gap 필드에 그대로 사용)
   - 갭 0~3 → 기간 무관 PASS
   - 갭 4~6 → 훈련 기간 8주 이상이면 PASS, 미만이면 WARN
   - 갭 7~10 → 훈련 기간 12주 이상이면 WARN, 미만이면 FAIL
   - 갭 11 이상 → 기간 무관 FAIL
   - judgment에 따라 격려/주의/경고 메시지를 message 필드에 작성해

2. 훈련 기간 충분성
   - 총 훈련 가능 주수: {total_weeks}주 (서버 계산값, 재계산 금지. total_weeks 필드에 그대로 사용)
   - 필요 훈련 주수: {weeks_needed}주 (서버 계산값, 재계산 금지. weeks_needed_for_volume 필드에 그대로 사용)
   - 총 주수 >= 필요 주수이면 PASS, 75~99%이면 WARN, 75% 미만이면 FAIL
   - judgment에 따라 격려/주의/경고 메시지를 message 필드에 작성해

3. 최대 주행 거리 적합성
   - 러너의 최근 최대 장거리 런 거리를 확인해
   - 목표 종목에 따른 권장 최소 장거리 런 거리를 계산해 (5K: 8km, 10K: 12km, 하프: 16km, 풀: 24km)
   - 현재 >= 권장이면 PASS, 80~99%이면 WARN, 80% 미만이면 FAIL
   - judgment에 따라 격려/주의/경고 메시지를 message 필드에 작성해

4. 종합 판정
   - 3가지 항목 모두 PASS이면 GREEN
   - FAIL이 하나라도 있으면 RED
   - 나머지는 YELLOW
   - 목표 기록이 비현실적일 경우 realistic_goal.suggested_time에 현실적인 목표 기록을 제안해 (형식: "H:MM:SS" 또는 "MM:SS")
   - 목표 기록이 적절하면 realistic_goal.suggested_time은 null

5. AI 분석 결과 (analysis)
   - strengths: 러너의 강점 2~3가지를 간결한 한국어 문장으로 (예: "충분한 마일리지 기반이 잘 다져져 있어요")
   - warnings: 주의해야 할 점 1~2가지를 간결한 한국어 문장으로 (예: "대회까지 남은 기간이 조금 짧은 편이에요")
   - recommendations: 훈련 추천사항 2~3가지를 간결한 한국어 문장으로 (예: "주 1회 템포런을 추가해보세요")

[출력 형식]
반드시 아래 JSON만 출력해. 설명이나 마크다운 코드블록 없이 JSON만.
{
  "validation": {
    "status": "GREEN" | "YELLOW" | "RED",
    "vdot": {
      "estimated_current": number,
      "required_for_goal": number,
      "gap": number,
      "judgment": "PASS" | "WARN" | "FAIL",
      "message": string
    },
    "training_period": {
      "total_weeks": number,
      "weeks_needed_for_volume": number,
      "judgment": "PASS" | "WARN" | "FAIL",
      "message": string
    },
    "max_run_distance": {
      "current_max_km": number,
      "recommended_min_km": number,
      "judgment": "PASS" | "WARN" | "FAIL",
      "message": string
    },
    "realistic_goal": {
      "suggested_time": string | null,
      "message": string
    },
    "analysis": {
      "strengths": [string],
      "warnings": [string],
      "recommendations": [string]
    }
  }
}`;

// VDOT 표 (Tempo 열, sec/km) — 역산에 사용
const VDOT_TEMPO_TABLE = [
  { v: 30, tempo: 411 }, { v: 32, tempo: 393 }, { v: 34, tempo: 375 },
  { v: 36, tempo: 359 }, { v: 38, tempo: 344 }, { v: 40, tempo: 331 },
  { v: 42, tempo: 319 }, { v: 44, tempo: 308 }, { v: 46, tempo: 297 },
  { v: 48, tempo: 288 }, { v: 50, tempo: 279 }, { v: 52, tempo: 270 },
  { v: 54, tempo: 262 }, { v: 56, tempo: 255 }, { v: 58, tempo: 248 },
  { v: 60, tempo: 242 },
];

// PB 기반 VDOT 계산 (Jack Daniels 공식)
function calcVdotFromRace(distKm: number, timeSec: number): number {
  const T = timeSec / 60;
  const D = distKm * 1000;
  const V = D / T;
  const pctVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * T) + 0.2989558 * Math.exp(-0.1932605 * T);
  const vo2 = -4.6 + 0.182258 * V + 0.000104 * V * V;
  return Math.max(30, Math.min(60, vo2 / pctVO2max));
}

// HR>140 러닝 페이스 기반 VDOT 역산 (Tempo 열 기준)
function calcVdotFromRunningPace(paceSec: number): number {
  if (paceSec >= VDOT_TEMPO_TABLE[0].tempo) return 30; // 너무 느림 → clamp
  if (paceSec <= VDOT_TEMPO_TABLE[VDOT_TEMPO_TABLE.length - 1].tempo) return 60;
  for (let i = 0; i < VDOT_TEMPO_TABLE.length - 1; i++) {
    const hi = VDOT_TEMPO_TABLE[i];
    const lo = VDOT_TEMPO_TABLE[i + 1];
    if (paceSec <= hi.tempo && paceSec >= lo.tempo) {
      const ratio = (hi.tempo - paceSec) / (hi.tempo - lo.tempo);
      return hi.v + ratio * (lo.v - hi.v);
    }
  }
  return 30;
}

function calcCurrentVdot(data: RunnerFormData): number {
  const raceDistMap: Record<string, number> = { "5k": 5, "10k": 10, half: 21.0975, full: 42.195 };

  let vdot = 30;

  // PB 기반 계산
  if (!data.noPb) {
    const pbSec = data.pbHours * 3600 + data.pbMinutes * 60 + data.pbSeconds;
    const distKm = raceDistMap[data.raceType] ?? 10;
    if (pbSec > 0) {
      vdot = calcVdotFromRace(distKm, pbSec);
    }
  }

  // HR>140 러닝 페이스 기반 역산 (더 높은 값 채택)
  const runPaceSec = data.runningPaceMin * 60 + data.runningPaceSec;
  if (runPaceSec > 0) {
    const vdotFromRun = calcVdotFromRunningPace(runPaceSec);
    vdot = Math.max(vdot, vdotFromRun);
  }

  return Math.round(Math.max(30, Math.min(60, vdot)) * 10) / 10;
}

function formatRunnerData(data: RunnerFormData): string {
  const goalTime =
    data.goalHours > 0
      ? `${data.goalHours}시간 ${data.goalMinutes}분`
      : `${data.goalMinutes}분`;

  const pbTime = data.noPb
    ? "기록 없음"
    : `${data.pbHours > 0 ? data.pbHours + "시간 " : ""}${data.pbMinutes}분 ${data.pbSeconds}초`;

  const raceTypeLabel: Record<string, string> = {
    "5k": "5K",
    "10k": "10K",
    half: "하프마라톤(21.1km)",
    full: "풀마라톤(42.2km)",
  };

  const lines = [
    `목표 종목: ${raceTypeLabel[data.raceType] ?? data.raceType}`,
    `대회 날짜: ${data.raceDate}`,
    `목표 기록: ${goalTime}`,
    `개인 최고 기록(PB): ${pbTime}`,
    `성별: ${data.gender === "male" ? "남성" : "여성"}`,
    `나이: ${data.age}세`,
    `러닝 경력: ${data.expYears}년 ${data.expMonths}개월`,
    `최근 1주 주간 거리: ${data.weeklyMileage1}km`,
    `최근 4주 총 주행 거리: ${data.weeklyMileage4}km (주간 평균 ${Math.round(data.weeklyMileage4 / 4)}km)`,
    `최근 최대 장거리 런: ${data.maxRunDistance}km`,
    `주당 훈련 일수: ${data.trainingDays.length}일 (${data.trainingDays.join(", ")})`,
    `조깅 데이터 (HR<140): ${data.joggingDist}km, ${data.joggingPaceMin}:${String(data.joggingPaceSec).padStart(2, "0")}/km, HR ${data.joggingHr}${data.joggingCadence ? ", 케이던스 " + data.joggingCadence + "spm" : ""}`,
    `러닝 데이터 (HR≥140): ${data.runningDist}km, ${data.runningPaceMin}:${String(data.runningPaceSec).padStart(2, "0")}/km, HR ${data.runningHr}${data.runningCadence ? ", 케이던스 " + data.runningCadence + "spm" : ""}`,
  ];

  return lines.join("\n");
}

export async function POST(request: Request) {
  let body: RunnerFormData;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const daysUntilRace = Math.max(0, Math.floor(
    (new Date(body.raceDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const totalWeeks = Math.floor(daysUntilRace / 7);
  const currentVdot = calcCurrentVdot(body);

  const raceDistMap: Record<string, number> = { "5k": 5, "10k": 10, half: 21.0975, full: 42.195 };
  const goalTotalSec = body.goalHours * 3600 + body.goalMinutes * 60;
  const goalDistKm = raceDistMap[body.raceType] ?? 10;
  const goalVdot = goalTotalSec > 0
    ? Math.round(calcVdotFromRace(goalDistKm, goalTotalSec) * 10) / 10
    : currentVdot;
  const vdotGap = Math.round((goalVdot - currentVdot) * 10) / 10;

  // 필요 훈련 주수 서버 계산 (종목 기준 + VDOT 갭 보정)
  const raceBaseWeeks: Record<string, number> = { "5k": 4, "10k": 6, half: 8, full: 12 };
  const weeksNeeded = (raceBaseWeeks[body.raceType] ?? 8) + Math.floor(Math.max(0, vdotGap) / 2);

  console.log("[/api/validate] today:", today, "| daysUntilRace:", daysUntilRace, "| totalWeeks:", totalWeeks);
  console.log("[/api/validate] currentVdot:", currentVdot, "| goalVdot:", goalVdot, "| gap:", vdotGap, "| weeksNeeded:", weeksNeeded);

  const systemPrompt = VALIDATE_PROMPT
    .replace("{today}", today)
    .replace("{total_weeks}", String(totalWeeks))
    .replace("{weeks_needed}", String(weeksNeeded))
    .replace("{current_vdot}", String(currentVdot))
    .replace("{goal_vdot}", String(goalVdot))
    .replace("{vdot_gap}", String(vdotGap));

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `다음 러너의 정보를 검증해줘:\n\n${formatRunnerData(body)}`,
        },
      ],
      system: systemPrompt,
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    const { input_tokens, output_tokens } = message.usage;
    const inputCost  = (input_tokens  / 1_000_000) * 3.0;
    const outputCost = (output_tokens / 1_000_000) * 15.0;
    console.log(
      `[/api/validate] usage — input: ${input_tokens} tokens, output: ${output_tokens} tokens` +
      ` | cost: $${(inputCost + outputCost).toFixed(6)} (in $${inputCost.toFixed(6)} + out $${outputCost.toFixed(6)})`
    );

    console.log("[/api/validate] Raw AI response:", raw);

    // 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let result: ValidationResult;
    try {
      result = JSON.parse(text);
      // 코드 계산값으로 강제 오버라이드 (LLM 재추정 방지)
      result.validation.vdot.estimated_current = currentVdot;
      result.validation.vdot.required_for_goal = goalVdot;
      result.validation.vdot.gap = vdotGap;
      result.validation.training_period.total_weeks = totalWeeks;
      result.validation.training_period.weeks_needed_for_volume = weeksNeeded;
      // judgment/status 재계산 (LLM 판단 무효화)
      const ratio = totalWeeks / weeksNeeded;
      const periodJudgment = ratio >= 1 ? "PASS" : ratio >= 0.75 ? "WARN" : "FAIL";
      result.validation.training_period.judgment = periodJudgment;
      // 종합 판정 재계산
      // RED: VDOT 또는 기간이 FAIL인 경우만 (LSD FAIL 단독은 YELLOW)
      const lsdJudgment = result.validation.max_run_distance.judgment;
      const allPass =
        result.validation.vdot.judgment === "PASS" &&
        periodJudgment === "PASS" &&
        lsdJudgment === "PASS";
      const criticalFail =
        result.validation.vdot.judgment === "FAIL" ||
        periodJudgment === "FAIL";

      if (allPass) {
        result.validation.status = "GREEN";
      } else if (criticalFail) {
        result.validation.status = "RED";
      } else {
        result.validation.status = "YELLOW";
      }
    } catch (parseErr) {
      console.error("[/api/validate] JSON parse failed. parseErr:", parseErr);
      console.error("[/api/validate] Cleaned text:", text);
      return Response.json(
        { error: "Failed to parse AI response", raw },
        { status: 502 }
      );
    }

    return Response.json(result);
  } catch (err) {
    console.error("[/api/validate] Anthropic API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
