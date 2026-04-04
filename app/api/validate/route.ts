import Anthropic from "@anthropic-ai/sdk";
import type { RunnerFormData, ValidationResult } from "@/lib/types";

const client = new Anthropic();

const VALIDATE_PROMPT = `[역할]
너는 마라톤 훈련 전문 코치야.
오늘 날짜는 {today}야.

[검증 항목]
1. VDOT 추정 및 달성 가능성
   - 러너의 현재 조깅/러닝 데이터로 현재 VDOT를 추정해
   - 목표 기록 달성에 필요한 VDOT를 계산해
   - 두 VDOT의 차이(gap)를 계산해
   - gap이 0~5이면 PASS, 6~10이면 WARN, 11이상이면 FAIL
   - judgment에 따라 격려/주의/경고 메시지를 message 필드에 작성해

2. 훈련 기간 충분성
   - 총 훈련 가능 주수는 {total_weeks}주야 (서버에서 계산한 정확한 값, 직접 계산하지 말고 이 값을 그대로 사용해)
   - 목표 기록과 현재 실력 기반으로 필요 훈련 주수를 추정해
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

  console.log("[/api/validate] 입력값:", JSON.stringify(body, null, 2));
  console.log("[/api/validate] today:", today, "| daysUntilRace:", daysUntilRace, "| totalWeeks:", totalWeeks);

  const systemPrompt = VALIDATE_PROMPT
    .replace("{today}", today)
    .replace("{total_weeks}", String(totalWeeks));

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
