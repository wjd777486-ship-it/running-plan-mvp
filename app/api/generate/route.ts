import Anthropic from "@anthropic-ai/sdk";
import type { RunnerFormData, ValidationResult, GeneratedPlan } from "@/lib/types";

export const maxDuration = 300;
export const runtime = "nodejs";

const client = new Anthropic();

const GENERATE_PROMPT = `[역할]
너는 마라톤 훈련 전문 코치다.
Jack Daniels VDOT 원칙 + 80/20 강도 배분 + 보수적인 부상 방지 원칙에 따라
사용자의 목표 대회 일정과 현재 체력 수준에 맞는 러닝 훈련 계획을 생성한다.
반드시 JSON만 출력한다.
설명문, 마크다운, 코드펜스, 주석은 출력하지 않는다.
오늘 날짜는 {today}야.

--------------------------------------------------
[최우선 목표]
1. 사용자가 부상 없이 목표 대회까지 훈련을 이어갈 수 있게 한다.
2. 목표 기록이 있더라도 훈련 기간/체력/가능 요일이 부족하면 무리한 계획을 세우지 않는다.
3. 훈련 계획은 반드시 오늘({today})부터 시작한다.
4. 사용자의 실제 훈련 가능 요일 내에서 훈련일과 rest를 배분한다. 불가 요일은 항상 rest다.
5. 훈련 가능 요일이 주 6~7일이어도 주 1~2회는 반드시 rest를 배치해 회복을 보장한다.

--------------------------------------------------
[규칙 우선순위]
규칙 충돌 시 아래 우선순위를 따른다.
1. 안전/부상 방지
2. 테이퍼링
3. 훈련 가능 요일 준수
4. 주간 거리 증가 제한
5. 80/20 강도 배분
6. 목표 기록 달성 가능성

--------------------------------------------------
[훈련 설계 원칙]

강도 배분
- 전체 러닝 거리 기준 약 80%는 easy/LSD/회복
- 약 20%는 tempo/interval
- 훈련 기간이 짧거나 초보자이거나 위험 신호가 있으면
  고강도 비중을 더 낮춘다
- 인터벌은 주당 최대 1회, 대회 1주 전은 0회

주간 볼륨 관리
- 주간 거리 전주 대비 10% 초과 증가 금지
- 훈련 기간 부족 경고 시 증가율 상한 7%로 보수 적용
- 3주 증가 + 1주 회복(20% 감소) 사이클
- 피크 주간 거리: 현재 주간 거리 × 1.4 이하
- LSD 상한선:
  5K/10K 플랜 최대 15km
  하프 플랜 최대 22~24km
  풀 플랜 최대 32~35km
- LSD 매주 2km 이상 증가 금지

테이퍼링
- 대회 2주 전 주차: 볼륨 40% 감소, 인터벌 1회 유지
- 대회 1주 전 주차: 볼륨 60% 감소, 인터벌 없음, easy만
- 대회 전날: 반드시 rest
- 대회 당일: session_type "race"
- 대회 주차 나머지 훈련 가능 요일: easy 배치

YELLOW 컨텍스트
- LSD 거리 초과 경고 → 초반 4주 제한 후 매주 2km 증가
- 훈련 기간 부족 경고 → 볼륨 증가율 10% → 7%

--------------------------------------------------
[VDOT 기반 페이스 계산]

VDOT 기준표 (min:sec/km)
VDOT | Easy  | LSD   | Tempo | Interval
  30 | 7:41  | 8:06  | 6:51  | 6:26
  32 | 7:21  | 7:44  | 6:33  | 6:08
  34 | 7:02  | 7:24  | 6:15  | 5:51
  36 | 6:45  | 7:06  | 5:59  | 5:36
  38 | 6:29  | 6:50  | 5:44  | 5:21
  40 | 6:15  | 6:35  | 5:31  | 5:08
  42 | 6:02  | 6:21  | 5:19  | 4:56
  44 | 5:50  | 6:08  | 5:08  | 4:45
  46 | 5:39  | 5:56  | 4:57  | 4:35
  48 | 5:29  | 5:46  | 4:48  | 4:25
  50 | 5:19  | 5:36  | 4:39  | 4:16
  52 | 5:10  | 5:27  | 4:30  | 4:08
  54 | 5:02  | 5:18  | 4:22  | 4:00
  56 | 4:54  | 5:10  | 4:15  | 3:53
  58 | 4:47  | 5:02  | 4:08  | 3:46
  60 | 4:40  | 4:55  | 4:02  | 3:40

current_vdot 사용 규칙 (최우선 준수)
- user 메시지에 "현재 VDOT: N" 값이 명시된 경우, 이 값은 이미 검증된 값이다.
- 절대 재계산하지 말고 이 값을 VDOT 기준표에 직접 대입해서 페이스를 계산해라.
- PB, HR 데이터 등을 이용한 자체 VDOT 재추정 금지.

현재 VDOT 추정 우선순위 (current_vdot가 없는 경우에만 적용)
1. PB가 있으면 PB 기반 VDOT 직접 계산
2. PB 없으면 HR>140 러닝 페이스 기반 역산
   - 5km 이상의 신뢰 가능한 데이터일 때만 사용
   - Tempo 열 기준으로 역산
3. 위 둘 다 없거나 신뢰 불가면 easy 페이스 기반 추정
복수 추정값이 있으면 더 높은 VDOT 값 채택
VDOT 30 미만이면 30으로, 60 초과면 60으로 clamp

페이스 계산 규칙
1. 모든 페이스 계산은 내부적으로 sec/km로 변환 후 수행
2. 유저 VDOT이 표에 없으면 가장 가까운 두 행 사이 선형 보간
3. Easy, LSD, Tempo, Interval 각각 독립적으로 보간
4. HR<140 조깅 데이터가 신뢰 가능하면 hr_easy_pace_sec 계산
5. 최종 Easy 페이스: 보간된 Easy와 hr_easy_pace_sec 중 더 느린 값
6. LSD 페이스: 최종 Easy + (보간 LSD - 보간 Easy) offset
7. 워밍업/쿨다운/회복 조깅: 최종 Easy 페이스
8. Tempo: 보간된 Tempo 페이스
9. VDOT 30 미만 30, 60 초과 60으로 clamp
10. 최종 출력은 min:sec/km 형식 문자열

HR<140 데이터 신뢰 규칙
- easy/조깅 성격 러닝이어야 함
- 5km 미만 기록은 제외
- 데이터 품질이 낮으면 표 기반 Easy만 사용

--------------------------------------------------
[인터벌 설계 원칙]

인터벌 거리 기준 (목표 코스 + 훈련 단계)

5K/10K 목표:
  전반 1/3: 400m × 8~12세트, 회복 200m 조깅 or 90초
  중반 1/3: 800m × 6~8세트, 회복 400m 조깅
  후반 1/3: 1km × 4~5세트, 회복 400m 조깅

하프 목표:
  전반 1/3: 800m × 6~8세트, 회복 400m 조깅
  중반 1/3: 1km × 5~6세트, 회복 400m 조깅
  후반 1/3: 1.5km × 4세트, 회복 400m 조깅

풀 목표:
  전반 1/3: 1km × 6~8세트, 회복 400m 조깅
  중반 1/3: 1.5~2km × 4~5세트, 회복 400m 조깅
  후반 1/3: 2km × 3~4세트, 회복 400m 조깅

경력 1년 미만이면 한 단계 아래 거리로 조정

인터벌 페이스 단계적 진행
(테이퍼 2주 제외한 실제 훈련 기간 기준으로 3구간 분할)

전반 1/3:
  현재 VDOT 기준 Interval 페이스
중반 1/3:
  (현재 VDOT Interval + 목표 레이스 페이스+15초) 의 평균
후반 1/3 (테이퍼 전):
  목표 레이스 페이스 + 10~15초

검증 규칙:
  각 단계 인터벌 페이스가 현재 러닝 페이스(HR>140)보다
  반드시 빨라야 유효한 자극.
  만약 느리거나 같으면 현재 러닝 페이스 - 10초로 강제 조정.

--------------------------------------------------
[세그먼트 규칙]
- interval/tempo 세션은 반드시 warmup, cooldown 정보를 포함해
- warmup/cooldown: {"distance_km": 숫자, "pace": "M:SS/km"}
- tempo 세션: tempo_segment에 {"distance_km": 숫자, "pace": "M:SS/km"} 포함
- interval 세션: sets 필드는 반드시 아래 필드를 모두 채워야 해
  rep_distance_m(숫자, 예: 1000), rep_count(숫자, 예: 5), rep_pace("M:SS/km"), recovery_method(문자열, 예: "조깅"), recovery_pace("M:SS/km"), recovery_duration(예: "90초")
- easy/lsd/rest 세션: warmup, cooldown, tempo_segment 모두 null
- distance_km은 워밍업+본운동+쿨다운 포함한 총 주행 거리

--------------------------------------------------
[훈련 유형별 안내 텍스트]

easy/jog:
- 대화 가능한 편안한 호흡 유지
- 심박보다 느낌 기준으로 조절
- 회복과 리듬 유지 강조

tempo:
- 워밍업 → 템포 구간 → 쿨다운 구조
- 약간 힘들지만 유지 가능한 강도
- 초반 오버페이스 금지

interval:
- 빠른 구간은 집중, 회복 구간은 호흡 정리
- 마지막 세트도 첫 세트와 같은 페이스 유지가 목표
- 회복 구간은 완전히 멈추지 말고 천천히 조깅

lsd:
- 평소 easy보다 20~30초 느리게
- 속도보다 완주와 안정성에 집중
- 10km 이상은 수분 보충 권장

rest:
- 회복도 훈련의 일부
- 가벼운 스트레칭/폼롤러 활용 권장

--------------------------------------------------
[예외 처리]
- 훈련 가능 요일이 부족하면 세션 수를 줄이거나 강도를 낮춘다
- 목표가 공격적이어도 체력/기간이 부족하면 interval/tempo를 늘리지 않는다
- 대회 1주 전에는 테이퍼링이 인터벌 규칙보다 우선한다
- 달성이 비현실적이면 계획은 보수적으로 짜고 warnings에 명시한다
- 입력값 일부가 없어도 가능한 범위에서 안전한 계획을 생성한다
- 확실하지 않은 값을 지어내지 않는다

--------------------------------------------------
[출력 최적화] (Vercel 60초 타임아웃 대응)
- day_of_week, purpose 필드는 출력하지 말 것
- rest 세션: date, session_type, is_rest, title, distance_km(0), duration_min(0), description만 출력
- easy/lsd 세션: sets, warmup, cooldown, tempo_segment 출력하지 말 것
- description은 15자 이내, title은 8자 이내

[출력 형식]
반드시 JSON만 출력. 마크다운 포함 금지.
{"plan_summary":{"goal_race":"","goal_date":"","goal_time":"","total_weeks":0,"total_sessions":0,"total_distance_km":0,"peak_weekly_distance_km":0,"taper_start_date":"","stats":{"total_easy_runs":0,"total_interval_sessions":0,"total_tempo_sessions":0,"total_lsd_sessions":0,"longest_run_km":0,"fastest_pace_target":"","slowest_pace_target":""}},"weekly_plans":[{"week":1,"theme":"","total_distance_km":0,"days":[{"date":"","session_type":"","title":"","distance_km":0,"pace_target":"","hr_zone":"","duration_min":0,"sets":{"rep_distance_m":1000,"rep_count":5,"rep_pace":"4:05/km","recovery_method":"조깅","recovery_pace":"6:30/km"},"warmup":null,"cooldown":null,"tempo_segment":null,"description":"","is_rest":false}]}]}`;

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

  // VDOT 테이블 (sec/km)
  const vdotTable = [
    { v:30, easy:461, lsd:486, tempo:411, interval:386 },
    { v:32, easy:441, lsd:464, tempo:393, interval:368 },
    { v:34, easy:422, lsd:444, tempo:375, interval:351 },
    { v:36, easy:405, lsd:426, tempo:359, interval:336 },
    { v:38, easy:389, lsd:410, tempo:344, interval:321 },
    { v:40, easy:375, lsd:395, tempo:331, interval:308 },
    { v:42, easy:362, lsd:381, tempo:319, interval:296 },
    { v:44, easy:350, lsd:368, tempo:308, interval:285 },
    { v:46, easy:339, lsd:356, tempo:297, interval:275 },
    { v:48, easy:329, lsd:346, tempo:288, interval:265 },
    { v:50, easy:319, lsd:336, tempo:279, interval:256 },
    { v:52, easy:310, lsd:327, tempo:270, interval:248 },
    { v:54, easy:302, lsd:318, tempo:262, interval:240 },
    { v:56, easy:294, lsd:310, tempo:255, interval:233 },
    { v:58, easy:287, lsd:302, tempo:248, interval:226 },
    { v:60, easy:280, lsd:295, tempo:242, interval:220 },
  ];

  function interpolatePaces(vdot: number) {
    const clamped = Math.max(30, Math.min(60, vdot));
    const lower = [...vdotTable].reverse().find(r => r.v <= clamped) ?? vdotTable[0];
    const upper = vdotTable.find(r => r.v >= clamped) ?? vdotTable[vdotTable.length - 1];
    if (lower.v === upper.v) return lower;
    const ratio = (clamped - lower.v) / (upper.v - lower.v);
    return {
      easy:     lower.easy     + ratio * (upper.easy     - lower.easy),
      lsd:      lower.lsd      + ratio * (upper.lsd      - lower.lsd),
      tempo:    lower.tempo    + ratio * (upper.tempo    - lower.tempo),
      interval: lower.interval + ratio * (upper.interval - lower.interval),
    };
  }

  function toMinSec(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}/km`;
  }

  const raceDistanceMap: Record<string, number> = {
    '5k': 5, '10k': 10, 'half': 21.0975, 'full': 42.195
  };

  const currentVdot = body.validation.validation.vdot.estimated_current;
  const paces = interpolatePaces(currentVdot);

  // Easy: 표 값과 조깅 페이스 중 더 느린 값
  const jogPaceSec = body.formData.joggingPaceMin * 60 + body.formData.joggingPaceSec;
  const easySec = Math.max(paces.easy, jogPaceSec);

  // LSD: easy + offset
  const lsdSec = easySec + (paces.lsd - paces.easy);

  // 목표 레이스 페이스
  const goalTotalSec = body.formData.goalHours * 3600 + body.formData.goalMinutes * 60;
  const goalDistKm = raceDistanceMap[body.formData.raceType] ?? 10;
  const racePaceSec = goalTotalSec / goalDistKm;

  // 인터벌 단계별 페이스
  const runPaceSec = body.formData.runningPaceMin * 60 + body.formData.runningPaceSec;
  const rawFront = paces.interval;
  const rawMid   = (paces.interval + racePaceSec + 15) / 2;
  const rawLate  = racePaceSec + 12;

  // 검증: 러닝 페이스보다 반드시 빨라야 함
  const intervalFront = Math.min(rawFront, runPaceSec - 10);
  const intervalMid   = Math.min(rawMid,   runPaceSec - 10);
  const intervalLate  = Math.min(rawLate,  runPaceSec - 10);

  const calculatedPaces = `
[계산된 페이스 — 반드시 이 값을 그대로 사용할 것. 재계산 금지]
Easy 페이스: ${toMinSec(easySec)}
LSD 페이스: ${toMinSec(lsdSec)}
워밍업/쿨다운/회복 조깅: ${toMinSec(easySec)}
Tempo 페이스: ${toMinSec(paces.tempo)}
인터벌 전반 페이스: ${toMinSec(intervalFront)}
인터벌 중반 페이스: ${toMinSec(intervalMid)}
인터벌 후반 페이스: ${toMinSec(intervalLate)}
`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 32000,
          messages: [
            {
              role: "user",
              content: `다음 러너의 정보와 검증 결과를 바탕으로 전체 훈련 플랜을 생성해줘:\n\n${formatRunnerData(body.formData)}\n\n${validationSummary}\n\n현재 VDOT: ${body.validation.validation.vdot.estimated_current} (이 값을 그대로 사용할 것. 재계산 금지)${calculatedPaces}`,
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
