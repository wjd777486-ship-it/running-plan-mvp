import Anthropic from "@anthropic-ai/sdk";
import type { RunnerFormData, ValidationResult, GeneratedPlan } from "@/lib/types";

export const maxDuration = 300;
export const runtime = "nodejs";

const client = new Anthropic();

const GENERATE_PROMPT = `[역할]
너는 마라톤 훈련 전문 코치야.
Jack Daniels VDOT 이론과 80/20 훈련 원칙을 기반으로 전체 훈련 플랜을 JSON으로 생성해.
오늘 날짜는 {today}야.

[훈련 설계 원칙]
페이스 계산 (반드시 현재 HR 데이터 기반으로 산출할 것. 목표 레이스 페이스 기반 계산 금지):
- easy: 조깅 데이터(HR<140) 페이스를 그대로 사용
- LSD: easy 페이스보다 15~25초 느리게
- 템포: 러닝 데이터(HR≥140) 페이스보다 10~20초 느리게
- 인터벌: 러닝 데이터(HR≥140) 페이스보다 5~15초 빠르게

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
- 대회 1주 전(대회가 있는 주 포함): 볼륨 60% 감소, 인터벌 없음
- 대회 전날: 반드시 rest
- 대회가 있는 주도 반드시 훈련 세션을 배치해야 함. 대회 전날(1일 전)만 rest이고, 나머지 훈련 가능 요일에는 easy/lsd 세션을 배치해야 해.

플랜 시작일 규칙 (반드시 준수):
- 플랜의 첫 번째 날은 반드시 오늘({today})이어야 해
- 오늘이 주 중간이더라도 다음 주로 미루지 말고, 오늘부터 바로 시작해
- 첫 주가 부분 주(partial week)인 경우: 남은 요일 중 훈련 가능 요일에만 세션 배치, 나머지는 rest

훈련 요일 규칙 (반드시 준수):
- 훈련 가능 요일에는 반드시 훈련 세션(easy/tempo/interval/lsd)을 배치해
- 훈련 가능 요일이 아닌 날은 반드시 rest로 처리해
- 이 규칙은 테이퍼 기간 포함 전 기간에 동일하게 적용해 (단, 대회 전날은 예외로 rest)

YELLOW 컨텍스트:
- max_run_distance WARN이면: 초반 4주 LSD를 현재 최대 거리 기준으로 제한, 매주 2km씩 증가
- training_period WARN이면: 볼륨 증가를 10% 대신 7%로 조정

[세그먼트 규칙]
- interval/tempo 세션은 반드시 warmup, cooldown 정보를 포함해
- warmup/cooldown: {"distance_km": 숫자, "pace": "M:SS/km"}
- tempo 세션: tempo_segment에 {"distance_km": 숫자, "pace": "M:SS/km"} 포함
- interval 세션: sets 필드는 반드시 아래 필드를 모두 채워야 해
  rep_distance_m(숫자, 예: 1000), rep_count(숫자, 예: 5), rep_pace("M:SS/km"), recovery_method(문자열, 예: "조깅"), recovery_pace("M:SS/km")
- easy/lsd/rest 세션: warmup, cooldown, tempo_segment 모두 null
- distance_km은 워밍업+본운동+쿨다운 포함한 총 주행 거리

[출력 최적화 규칙]
- rest 세션: sets/warmup/cooldown/tempo_segment는 출력하지 말 것 (null 값도 생략)
- description과 purpose는 각 20자 이내로 간결하게
- title은 10자 이내

[출력 형식]
반드시 JSON만 출력. 마크다운 포함 금지.
{"plan_summary":{"goal_race":"","goal_date":"","goal_time":"","total_weeks":0,"total_sessions":0,"total_distance_km":0,"peak_weekly_distance_km":0,"taper_start_date":"","stats":{"total_easy_runs":0,"total_interval_sessions":0,"total_tempo_sessions":0,"total_lsd_sessions":0,"longest_run_km":0,"fastest_pace_target":"","slowest_pace_target":""}},"weekly_plans":[{"week":1,"theme":"","total_distance_km":0,"days":[{"date":"","day_of_week":"","session_type":"","title":"","distance_km":0,"pace_target":"","hr_zone":"","duration_min":0,"sets":{"rep_distance_m":1000,"rep_count":5,"rep_pace":"4:05/km","recovery_method":"조깅","recovery_pace":"6:30/km"},"warmup":null,"cooldown":null,"tempo_segment":null,"description":"","purpose":"","is_rest":false}]}]}`;

const DAY_LABEL: Record<string, string> = {
  mon: "월요일(Monday)",
  tue: "화요일(Tuesday)",
  wed: "수요일(Wednesday)",
  thu: "목요일(Thursday)",
  fri: "금요일(Friday)",
  sat: "토요일(Saturday)",
  sun: "일요일(Sunday)",
};

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

  const trainingDayLabels = data.trainingDays.map((d) => DAY_LABEL[d] ?? d).join(", ");

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
    `주당 훈련 일수: ${data.trainingDays.length}일`,
    `훈련 가능 요일: ${trainingDayLabels}`,
    `조깅 데이터 (HR<140): ${data.joggingDist}km, ${data.joggingPaceMin}:${String(data.joggingPaceSec).padStart(2, "0")}/km, HR ${data.joggingHr}${data.joggingCadence ? ", 케이던스 " + data.joggingCadence + "spm" : ""}`,
    `러닝 데이터 (HR≥140): ${data.runningDist}km, ${data.runningPaceMin}:${String(data.runningPaceSec).padStart(2, "0")}/km, HR ${data.runningHr}${data.runningCadence ? ", 케이던스 " + data.runningCadence + "spm" : ""}`,
  ];

  return lines.join("\n");
}

interface GenerateRequestBody {
  formData: RunnerFormData;
  validation: ValidationResult;
  useAiGoal?: boolean;
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  console.log("[/api/generate] 입력값:", JSON.stringify(body.formData, null, 2));
  console.log("[/api/generate] today:", today);
  const systemPrompt = GENERATE_PROMPT.replace("{today}", today);

  const useAiGoal = body.useAiGoal ?? false;
  const { goalHours, goalMinutes } = body.formData;
  const userGoalTime = goalHours > 0 ? `${goalHours}시간 ${goalMinutes}분` : `${goalMinutes}분`;
  const suggestedTimeLine = useAiGoal && body.validation.validation.realistic_goal.suggested_time
    ? `- 현실적 목표 기록 제안: ${body.validation.validation.realistic_goal.suggested_time} (이 기록을 훈련 목표로 사용할 것)`
    : "";
  const goalOverrideLine = !useAiGoal
    ? `- 훈련 목표 기록: 반드시 ${userGoalTime}을 사용할 것. AI 추천 기록 무시.`
    : "";

  const validationSummary = `
검증 결과:
- 종합 판정: ${body.validation.validation.status}
- VDOT: 현재 ${body.validation.validation.vdot.estimated_current}, 목표 ${body.validation.validation.vdot.required_for_goal} (${body.validation.validation.vdot.judgment})
- 훈련 기간: 총 ${body.validation.validation.training_period.total_weeks}주 (${body.validation.validation.training_period.judgment})
- 최대 장거리 런: 현재 ${body.validation.validation.max_run_distance.current_max_km}km, 권장 ${body.validation.validation.max_run_distance.recommended_min_km}km (${body.validation.validation.max_run_distance.judgment})
${suggestedTimeLine}
${goalOverrideLine}
`.trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 32000,
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
