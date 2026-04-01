import Anthropic from "@anthropic-ai/sdk";
import type { RunnerFormData, ValidationResult, GeneratedPlan } from "@/lib/types";

export const maxDuration = 60;
export const runtime = "nodejs";

const client = new Anthropic();

const GENERATE_PROMPT = `[역할]
너는 마라톤 훈련 전문 코치야.
Jack Daniels VDOT 이론과 80/20 훈련 원칙을 기반으로 전체 훈련 플랜을 JSON으로 생성해.
오늘 날짜는 {today}야.

[훈련 설계 원칙]
페이스 계산:
- easy: 조깅 페이스 ±15초
- LSD: easy보다 20~30초 느리게
- 템포: 목표 레이스 페이스 + 15~20초
- 인터벌: 목표 레이스 페이스 - 10~15초

강도 배분:
- 80%: easy / LSD / 회복런
- 20%: 인터벌 / 템포
- 인터벌 매주 반드시 1회 포함

볼륨 관리:
- 주간 거리 전주 대비 10% 이상 증가 금지
- 3주 증가 + 1주 회복(볼륨 20% 감소) 사이클
- 피크 주간 거리: 현재 주간 거리 × 1.4 초과 금지

인터벌 구성:
- 경력 1년 미만: 400m × 6~8세트, 회복 조깅 90초
- 경력 1~3년: 1km × 5~6세트, 회복 조깅 90초
- 경력 3년 이상: 1km × 6~8세트, 회복 조깅 2분

테이퍼링:
- 대회 2주 전: 볼륨 40% 감소
- 대회 1주 전: 볼륨 60% 감소, 인터벌 없음
- 대회 전날: 반드시 rest

YELLOW 컨텍스트:
- max_run_distance WARN이면: 초반 4주 LSD를 현재 최대 거리 기준으로 제한, 매주 2km씩 증가
- training_period WARN이면: 볼륨 증가를 10% 대신 7%로 조정

[출력 형식]
반드시 JSON만 출력. 마크다운 포함 금지.
{"plan_summary":{"goal_race":"","goal_date":"","goal_time":"","total_weeks":0,"total_sessions":0,"total_distance_km":0,"peak_weekly_distance_km":0,"taper_start_date":"","stats":{"total_easy_runs":0,"total_interval_sessions":0,"total_tempo_sessions":0,"total_lsd_sessions":0,"longest_run_km":0,"fastest_pace_target":"","slowest_pace_target":""}},"weekly_plans":[{"week":1,"theme":"","total_distance_km":0,"days":[{"date":"","day_of_week":"","session_type":"","title":"","distance_km":0,"pace_target":"","hr_zone":"","duration_min":0,"sets":null,"description":"","purpose":"","is_rest":false}]}]}`;

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
    `최근 4주 평균 주간 거리: ${data.weeklyMileage4}km`,
    `최근 최대 장거리 런: ${data.maxRunDistance}km`,
    `주당 훈련 일수: ${data.trainingDays.length}일 (${data.trainingDays.join(", ")})`,
    `훈련 요일: ${data.trainingDays.join(", ")}`,
    `조깅 데이터 (HR<140): ${data.joggingDist}km, ${data.joggingPaceMin}:${String(data.joggingPaceSec).padStart(2, "0")}/km, HR ${data.joggingHr}${data.joggingCadence ? ", 케이던스 " + data.joggingCadence + "spm" : ""}`,
    `러닝 데이터 (HR≥140): ${data.runningDist}km, ${data.runningPaceMin}:${String(data.runningPaceSec).padStart(2, "0")}/km, HR ${data.runningHr}${data.runningCadence ? ", 케이던스 " + data.runningCadence + "spm" : ""}`,
  ];

  return lines.join("\n");
}

interface GenerateRequestBody {
  formData: RunnerFormData;
  validation: ValidationResult;
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = GENERATE_PROMPT.replace("{today}", today);

  const validationSummary = `
검증 결과:
- 종합 판정: ${body.validation.validation.status}
- VDOT: 현재 ${body.validation.validation.vdot.estimated_current}, 목표 ${body.validation.validation.vdot.required_for_goal} (${body.validation.validation.vdot.judgment})
- 훈련 기간: 총 ${body.validation.validation.training_period.total_weeks}주 (${body.validation.validation.training_period.judgment})
- 최대 장거리 런: 현재 ${body.validation.validation.max_run_distance.current_max_km}km, 권장 ${body.validation.validation.max_run_distance.recommended_min_km}km (${body.validation.validation.max_run_distance.judgment})
${body.validation.validation.realistic_goal.suggested_time ? `- 현실적 목표 기록 제안: ${body.validation.validation.realistic_goal.suggested_time}` : ""}
`.trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          messages: [
            {
              role: "user",
              content: `다음 러너의 정보와 검증 결과를 바탕으로 전체 훈련 플랜을 생성해줘:\n\n${formatRunnerData(body.formData)}\n\n${validationSummary}`,
            },
          ],
          system: systemPrompt,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        const finalMsg = await anthropicStream.finalMessage();
        const { input_tokens, output_tokens } = finalMsg.usage;
        const inputCost  = (input_tokens  / 1_000_000) * 3.0;
        const outputCost = (output_tokens / 1_000_000) * 15.0;
        console.log(
          `[/api/generate] usage — input: ${input_tokens} tokens, output: ${output_tokens} tokens` +
          ` | cost: $${(inputCost + outputCost).toFixed(6)} (in $${inputCost.toFixed(6)} + out $${outputCost.toFixed(6)})`
        );

        controller.close();
      } catch (err) {
        console.error("[/api/generate] Anthropic stream error:", err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n__ERROR__:${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
