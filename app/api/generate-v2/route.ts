import Anthropic from "@anthropic-ai/sdk";
import type { RunnerFormData, ValidationResult, GeneratedPlan, GeneratedDay, GeneratedWeek } from "@/lib/types";

export const maxDuration = 300;
export const runtime = "nodejs";

const client = new Anthropic();

// V2: LLM은 날짜 없이 세션 목록만 출력. 코드가 날짜 배정.
const GENERATE_PROMPT = `[역할]
너는 마라톤 훈련 전문 코치다.
Jack Daniels VDOT 원칙 + 80/20 강도 배분 + 보수적인 부상 방지 원칙에 따라
사용자의 목표 대회 일정과 현재 체력 수준에 맞는 러닝 훈련 계획을 생성한다.
반드시 JSON만 출력한다.
설명문, 마크다운, 코드펜스, 주석은 출력하지 않는다.

--------------------------------------------------
[최우선 목표]
1. 사용자가 부상 없이 목표 대회까지 훈련을 이어갈 수 있게 한다.
2. 목표 기록이 있더라도 훈련 기간/체력/가능 요일이 부족하면 무리한 계획을 세우지 않는다.
3. 주당 sessions 배열 개수 = 사용자의 주당 훈련 가능 일수.
   훈련 가능 요일이 아닌 날은 코드가 자동으로 rest 처리한다.
   rest 세션은 출력하지 않는다.
4. 세션 수가 많을수록 easy 비중을 높여 강도를 조절한다.
   interval/tempo는 주 1~2회를 넘기지 않고, 나머지는 easy/lsd로 채운다.

--------------------------------------------------
[규칙 우선순위]
규칙 충돌 시 아래 우선순위를 따른다.
1. 안전/부상 방지
2. 테이퍼링
3. 주당 세션 수 제한
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
- 대회 주차: sessions에 반드시 session_type "race" 1개 포함

단기 플랜 예외 처리 (일반 테이퍼링 규칙보다 우선 적용)
- 훈련 기간 2주 이하: 테이퍼 없음. 현재 볼륨 그대로 유지. 대회 전날 하루만 rest. 테이퍼 관련 볼륨 감량 일절 적용하지 않는다.
- 훈련 기간 3~4주: 테이퍼 없음. 현재 볼륨 ±10% 이내로 유지. 대회 전주(마지막 주)만 볼륨 20% 감량. 그 외 주차는 테이퍼 규칙 적용하지 않는다.
- 단기 플랜(4주 이하) 5K/10K 목표: LSD 상한 10km. 기존 15km 상한 무시.
- 볼륨 급증 금지: 단기 플랜에서도 주간 거리 전주 대비 10% 초과 증가 금지를 동일하게 적용한다. 짧은 기간이라고 예외 없음.

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

전반 1/3: (현재 VDOT Interval 페이스 + 목표 레이스 페이스) / 2
중반 1/3: (현재 VDOT Interval + 목표 레이스 페이스+15초) 의 평균
후반 1/3 (테이퍼 전): 목표 레이스 페이스 + 10~15초

검증 규칙:
  각 단계 인터벌 페이스가 현재 러닝 페이스(HR>140)보다 반드시 빨라야 유효한 자극.
  만약 느리거나 같으면 현재 러닝 페이스 - 10초로 강제 조정.

--------------------------------------------------
[세션 순서 규칙]
각 주차의 sessions 배열은 아래 순서로 출력한다:
1. interval 또는 tempo (있는 경우, 주중 배치 우선)
2. easy 세션들
3. lsd (있는 경우, 마지막에 배치)
4. race (대회 주차에만, 반드시 마지막)

--------------------------------------------------
[세그먼트 규칙]
- interval/tempo 세션은 반드시 warmup, cooldown 정보를 포함해
- warmup/cooldown: {"distance_km": 숫자, "pace": "M:SS/km"}
- tempo 세션: tempo_segment에 {"distance_km": 숫자, "pace": "M:SS/km"} 포함
- interval 세션: sets 필드는 반드시 아래 필드를 모두 채워야 해
  rep_distance_m(숫자), rep_count(숫자), rep_pace("M:SS/km"), recovery_method(문자열), recovery_pace("M:SS/km"), recovery_duration(예: "90초")
- easy/lsd 세션: sets, warmup, cooldown, tempo_segment 출력하지 말 것
- distance_km은 워밍업+본운동+쿨다운 포함한 총 주행 거리

--------------------------------------------------
[출력 최적화] (Vercel 60초 타임아웃 대응)
- rest 세션은 출력하지 말 것 (코드가 자동 배정)
- description은 15자 이내, title은 8자 이내

[출력 형식]
반드시 JSON만 출력. 마크다운 포함 금지.
날짜(date) 필드 출력 금지. 코드가 날짜를 배정한다.
{"plan_summary":{"goal_race":"","goal_date":"","goal_time":"","total_weeks":0,"total_sessions":0,"total_distance_km":0,"peak_weekly_distance_km":0,"taper_start_week":0,"stats":{"total_easy_runs":0,"total_interval_sessions":0,"total_tempo_sessions":0,"total_lsd_sessions":0,"longest_run_km":0,"fastest_pace_target":"","slowest_pace_target":""}},"weekly_plans":[{"week":1,"theme":"","total_distance_km":0,"sessions":[{"session_type":"easy","title":"","distance_km":0,"pace_target":"","hr_zone":"","duration_min":0,"sets":null,"warmup":null,"cooldown":null,"tempo_segment":null,"description":""}]}]}`;

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

// V2 LLM 출력 타입 (date 없음)
interface V2Session {
  session_type: "easy" | "interval" | "tempo" | "lsd" | "race";
  title: string;
  distance_km: number;
  pace_target: string;
  hr_zone: string;
  duration_min: number;
  sets: GeneratedDay["sets"];
  warmup: GeneratedDay["warmup"];
  cooldown: GeneratedDay["cooldown"];
  tempo_segment: GeneratedDay["tempo_segment"];
  description: string;
}

interface V2Week {
  week: number;
  theme: string;
  total_distance_km: number;
  sessions: V2Session[];
}

interface V2Plan {
  plan_summary: {
    goal_race: string;
    goal_date: string;
    goal_time: string;
    total_weeks: number;
    total_sessions: number;
    total_distance_km: number;
    peak_weekly_distance_km: number;
    taper_start_week: number;
    stats: {
      total_easy_runs: number;
      total_interval_sessions: number;
      total_tempo_sessions: number;
      total_lsd_sessions: number;
      longest_run_km: number;
      fastest_pace_target: string;
      slowest_pace_target: string;
    };
  };
  weekly_plans: V2Week[];
}

function makeRestDay(date: string): GeneratedDay {
  return {
    date,
    day_of_week: "",
    session_type: "rest",
    title: "Rest",
    distance_km: 0,
    pace_target: "",
    hr_zone: "",
    duration_min: 0,
    sets: null,
    warmup: null,
    cooldown: null,
    tempo_segment: null,
    description: "회복",
    purpose: "",
    is_rest: true,
  };
}

function sessionToDay(date: string, s: V2Session): GeneratedDay {
  return {
    date,
    day_of_week: "",
    session_type: s.session_type,
    title: s.title,
    distance_km: s.distance_km,
    pace_target: s.pace_target,
    hr_zone: s.hr_zone,
    duration_min: s.duration_min,
    sets: s.sets ?? null,
    warmup: s.warmup ?? null,
    cooldown: s.cooldown ?? null,
    tempo_segment: s.tempo_segment ?? null,
    description: s.description,
    purpose: "",
    is_rest: false,
  };
}

// 로컬 날짜 문자열 (toISOString은 UTC 기준이라 timezone 오류 발생)
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function assignDatesToPlan(v2Plan: V2Plan, formData: RunnerFormData, today: string): GeneratedPlan {
  const DAY_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const allowedDows = new Set(formData.trainingDays.map((d) => DAY_NUM[d]));
  const raceDate = formData.raceDate;

  // 대회 전날
  const raceDateObj = new Date(raceDate + "T00:00:00");
  raceDateObj.setDate(raceDateObj.getDate() - 1);
  const preRaceDay = localDateStr(raceDateObj);

  // taper_start_date 계산 (taper_start_week 기반)
  const taperStartWeek = v2Plan.plan_summary.taper_start_week ?? (v2Plan.weekly_plans.length - 1);
  const taperStartObj = new Date(today + "T00:00:00");
  taperStartObj.setDate(taperStartObj.getDate() + (taperStartWeek - 1) * 7);
  const taperStartDate = taperStartObj.toISOString().split("T")[0];

  const weeks: GeneratedWeek[] = v2Plan.weekly_plans.map((v2Week, weekIdx) => {
    // 이 주차의 시작일
    const weekStartObj = new Date(today + "T00:00:00");
    weekStartObj.setDate(weekStartObj.getDate() + weekIdx * 7);

    // 이 주차의 모든 날짜
    // 마지막 주차는 raceDate까지 확장 (7일 고정하면 raceDate가 범위 밖날 수 있음)
    const allDatesInWeek: string[] = [];
    const isLastWeek = weekIdx === v2Plan.weekly_plans.length - 1;
    if (isLastWeek) {
      const cursor = new Date(weekStartObj);
      while (true) {
        const dateStr = localDateStr(cursor);
        allDatesInWeek.push(dateStr);
        if (dateStr === raceDate) break;
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartObj);
        d.setDate(d.getDate() + i);
        allDatesInWeek.push(localDateStr(d));
      }
    }

    // 훈련 가능 날짜 (대회 전날 제외, 대회 당일 포함)
    const trainingDates = allDatesInWeek.filter((d) => {
      if (d === raceDate) return true;
      if (d === preRaceDay) return false;
      const dow = new Date(d + "T00:00:00").getDay();
      return allowedDows.has(dow);
    });

    // race 세션은 steps 1-3에서 완전히 제외하고 step 4에서만 raceDate 강제 배정
    // (race가 steps 1-3에 남아있으면 다른 날짜에 잘못 배정될 수 있음)
    const sessionsRaw = [...v2Week.sessions].filter((s) => s.session_type !== "race");

    // 날짜 → 세션 맵 (raceDate는 항상 비워둠)
    const assignment = new Map<string, V2Session>();

    // 1. LSD → raceDate 제외한 trainingDates 중 마지막 날짜 (주말 우선)
    const sessions = [...sessionsRaw];
    const lsdIdx = sessions.findIndex((s) => s.session_type === "lsd");
    const availableForLsd = trainingDates.filter((d) => d !== raceDate);
    if (lsdIdx >= 0 && availableForLsd.length > 0) {
      const weekend = availableForLsd.filter((d) => {
        const dow = new Date(d + "T00:00:00").getDay();
        return dow === 0 || dow === 6;
      });
      const lsdDate = weekend.length > 0
        ? weekend[weekend.length - 1]
        : availableForLsd[availableForLsd.length - 1];
      assignment.set(lsdDate, sessions[lsdIdx]);
      sessions.splice(lsdIdx, 1);
    }

    // 2. 나머지 세션 → raceDate 제외한 남은 trainingDates에 순서대로 배정
    const remaining = trainingDates.filter((d) => d !== raceDate && !assignment.has(d));
    for (let i = 0; i < Math.min(sessions.length, remaining.length); i++) {
      assignment.set(remaining[i], sessions[i]);
    }

    // 디버깅
    if (isLastWeek) {
      console.log("[assignDates] 마지막 주차 allDatesInWeek:", allDatesInWeek);
      console.log("[assignDates] raceDate:", raceDate);
      console.log("[assignDates] raceDate in allDatesInWeek:", allDatesInWeek.includes(raceDate));
      console.log("[assignDates] assignment keys before race:", [...assignment.keys()]);
    }

    // 3. raceDate는 항상 race 세션으로 강제 배정 (LLM 출력 무관, 허용 요일 무관)
    const raceDist = ({ "5k": 5, "10k": 10, half: 21.1, full: 42.2 } as Record<string, number>)[formData.raceType] ?? 10;
    const llmRaceSession = v2Week.sessions.find((s) => s.session_type === "race");
    const forcedRaceSession: V2Session = llmRaceSession ?? {
      session_type: "race",
      title: "대회",
      distance_km: raceDist,
      pace_target: "",
      hr_zone: "",
      duration_min: 0,
      sets: null,
      warmup: null,
      cooldown: null,
      tempo_segment: null,
      description: "대회 당일",
    };

    // 4. 전체 날짜 → GeneratedDay 배열 생성
    const days: GeneratedDay[] = allDatesInWeek.map((date) => {
      // raceDate: 허용 요일/assignment 무관하게 항상 race (최우선)
      if (date === raceDate) return sessionToDay(date, forcedRaceSession);
      if (date === preRaceDay) return makeRestDay(date);
      const session = assignment.get(date);
      if (session) return sessionToDay(date, session);
      return makeRestDay(date);
    });

    return {
      week: v2Week.week,
      theme: v2Week.theme,
      total_distance_km: v2Week.total_distance_km,
      days,
    };
  });

  return {
    plan_summary: {
      ...v2Plan.plan_summary,
      taper_start_date: taperStartDate,
    },
    weekly_plans: weeks,
  };
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
  console.log("[/api/generate-v2] today:", today);

  const useAiGoal = body.useAiGoal ?? false;
  const { goalHours, goalMinutes } = body.formData;
  const userGoalTime = goalHours > 0 ? `${goalHours}시간 ${goalMinutes}분` : `${goalMinutes}분`;
  const suggestedTimeLine =
    useAiGoal && body.validation.validation.realistic_goal.suggested_time
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
    { v: 30, easy: 461, lsd: 486, tempo: 411, interval: 386 },
    { v: 32, easy: 441, lsd: 464, tempo: 393, interval: 368 },
    { v: 34, easy: 422, lsd: 444, tempo: 375, interval: 351 },
    { v: 36, easy: 405, lsd: 426, tempo: 359, interval: 336 },
    { v: 38, easy: 389, lsd: 410, tempo: 344, interval: 321 },
    { v: 40, easy: 375, lsd: 395, tempo: 331, interval: 308 },
    { v: 42, easy: 362, lsd: 381, tempo: 319, interval: 296 },
    { v: 44, easy: 350, lsd: 368, tempo: 308, interval: 285 },
    { v: 46, easy: 339, lsd: 356, tempo: 297, interval: 275 },
    { v: 48, easy: 329, lsd: 346, tempo: 288, interval: 265 },
    { v: 50, easy: 319, lsd: 336, tempo: 279, interval: 256 },
    { v: 52, easy: 310, lsd: 327, tempo: 270, interval: 248 },
    { v: 54, easy: 302, lsd: 318, tempo: 262, interval: 240 },
    { v: 56, easy: 294, lsd: 310, tempo: 255, interval: 233 },
    { v: 58, easy: 287, lsd: 302, tempo: 248, interval: 226 },
    { v: 60, easy: 280, lsd: 295, tempo: 242, interval: 220 },
  ];

  function interpolatePaces(vdot: number) {
    const clamped = Math.max(30, Math.min(60, vdot));
    const lower = [...vdotTable].reverse().find((r) => r.v <= clamped) ?? vdotTable[0];
    const upper = vdotTable.find((r) => r.v >= clamped) ?? vdotTable[vdotTable.length - 1];
    if (lower.v === upper.v) return lower;
    const ratio = (clamped - lower.v) / (upper.v - lower.v);
    return {
      easy: lower.easy + ratio * (upper.easy - lower.easy),
      lsd: lower.lsd + ratio * (upper.lsd - lower.lsd),
      tempo: lower.tempo + ratio * (upper.tempo - lower.tempo),
      interval: lower.interval + ratio * (upper.interval - lower.interval),
    };
  }

  function toMinSec(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}/km`;
  }

  const raceDistanceMap: Record<string, number> = {
    "5k": 5, "10k": 10, half: 21.0975, full: 42.195,
  };

  const currentVdot = body.validation.validation.vdot.estimated_current;
  const paces = interpolatePaces(currentVdot);

  const jogPaceSec = body.formData.joggingPaceMin * 60 + body.formData.joggingPaceSec;
  const easySec = Math.max(paces.easy, jogPaceSec);
  const lsdSec = easySec + (paces.lsd - paces.easy);

  const goalTotalSec = body.formData.goalHours * 3600 + body.formData.goalMinutes * 60;
  const goalDistKm = raceDistanceMap[body.formData.raceType] ?? 10;
  const racePaceSec = goalTotalSec / goalDistKm;

  const runPaceSec = body.formData.runningPaceMin * 60 + body.formData.runningPaceSec;
  const rawFront = Math.min(paces.interval, (paces.interval + racePaceSec) / 2);
  const rawMid = (paces.interval + racePaceSec + 15) / 2;
  const rawLate = Math.max(racePaceSec - 10, paces.interval - 10);

  const intervalFront = Math.min(rawFront, runPaceSec - 10);
  const intervalMid = Math.min(rawMid, runPaceSec - 10);
  const intervalLate = Math.min(Math.min(rawLate, runPaceSec - 10), intervalMid);

  // 단기 플랜 여부 (4주 이하)
  const isShortPlan = totalWeeks <= 4;

  // LSD 시작값: max(maxRunDistance × 0.7, weeklyMileage1 × 0.25)
  let lsdStartKm = Math.max(
    Math.round(body.formData.maxRunDistance * 0.7 * 10) / 10,
    Math.round(body.formData.weeklyMileage1 * 0.25 * 10) / 10
  );

  // LSD 피크값: 판정 무관 공통 계산
  const maxRun = body.formData.maxRunDistance;
  // 단기 플랜 5K/10K: LSD 상한 10km
  const raceTypeLsdCeil: Record<string, number> = {
    "5k": isShortPlan ? 10 : 15,
    "10k": isShortPlan ? 10 : 15,
    half: 24,
    full: 35,
  };
  const raceTypeLsdFloor: Record<string, number> = { "5k": 0, "10k": 0, half: 16, full: 24 };
  const ceilKm = raceTypeLsdCeil[body.formData.raceType] ?? 15;
  const floorKm = raceTypeLsdFloor[body.formData.raceType] ?? 0;
  // 단기 플랜 시작값도 캡 이하로 클램프 (Math.max 역전 방지용)
  lsdStartKm = Math.min(lsdStartKm, ceilKm);
  let lsdPeakKm = Math.min(ceilKm, Math.round(maxRun * 1.4 * 10) / 10);
  lsdPeakKm = Math.max(lsdPeakKm, floorKm);
  lsdPeakKm = Math.max(lsdPeakKm, lsdStartKm); // 시작값보다 낮아지는 역전 방지

  // 주차별 LSD 스케줄 계산 (3+1 빌드/회복 사이클)
  // 회복주 이후 LSD는 회복 전 주 LSD + 2km (회복주 LSD + 2km 아님)
  const totalWeeks = body.validation.validation.training_period.total_weeks;
  const buildWeeks = Math.max(1, totalWeeks - 2); // 테이퍼 2주 제외
  const lsdSchedule: number[] = [];
  let buildLsd = lsdStartKm; // 회복주 직전 LSD값 (회복 후 재개 기준)

  for (let w = 1; w <= buildWeeks; w++) {
    const isRecovery = w > 1 && w % 4 === 0;
    const isPostRecovery = w > 1 && (w - 1) % 4 === 0;

    if (isRecovery) {
      // 회복주: 회복 전 주 LSD × 0.8 (buildLsd는 변경 없음)
      lsdSchedule.push(Math.round(buildLsd * 0.8 * 10) / 10);
    } else if (isPostRecovery) {
      // 회복주 이후: 회복 전 주 LSD + 2km
      buildLsd = Math.min(Math.round((buildLsd + 2) * 10) / 10, lsdPeakKm);
      lsdSchedule.push(buildLsd);
    } else {
      // 일반 빌드주: 전주 대비 +2km
      if (w > 1) buildLsd = Math.min(Math.round((buildLsd + 2) * 10) / 10, lsdPeakKm);
      lsdSchedule.push(buildLsd);
    }
  }

  const lsdScheduleText = lsdSchedule
    .map((km, i) => {
      const weekNum = i + 1;
      const isRecovery = weekNum > 1 && weekNum % 4 === 0;
      return `주 ${weekNum}: ${km}km${isRecovery ? " (회복주)" : ""}`;
    })
    .join("\n");

  // Easy 페이스 3구간 계산 (테이퍼 2주 제외한 buildWeeks 기준)
  const easyFrontEnd = Math.floor(buildWeeks / 3);
  const easyMidEnd = Math.floor((2 * buildWeeks) / 3);
  const easyFrontSec = easySec;
  const easyMidSec = easySec - 5;
  const easyLateSec = easySec - 10;

  // 테이퍼 시작 주차: 마지막 2주만 테이퍼 (totalWeeks - 1)
  const taperStartWeekNum = totalWeeks - 1;

  const calculatedPaces = `
[계산된 페이스 — 반드시 이 값을 그대로 사용할 것. 재계산 금지]
전반 Easy 페이스 (1~${easyFrontEnd}주): ${toMinSec(easyFrontSec)}
중반 Easy 페이스 (${easyFrontEnd + 1}~${easyMidEnd}주): ${toMinSec(easyMidSec)}
후반 Easy 페이스 (${easyMidEnd + 1}~${buildWeeks}주, 테이퍼 제외): ${toMinSec(easyLateSec)}
LSD 페이스: ${toMinSec(lsdSec)}
워밍업/쿨다운/회복 조깅: ${toMinSec(easyFrontSec)}
Tempo 페이스: ${toMinSec(paces.tempo)}
인터벌 전반 페이스: ${toMinSec(intervalFront)}
인터벌 중반 페이스: ${toMinSec(intervalMid)}
인터벌 후반 페이스: ${toMinSec(intervalLate)}

[테이퍼링 — 반드시 이 주차를 그대로 사용할 것]
taper_start_week: ${taperStartWeekNum} (${taperStartWeekNum}주차부터 테이퍼 시작, 마지막 2주만 테이퍼)
대회 2주 전 (${taperStartWeekNum}주차): 볼륨 40% 감소, 인터벌 1회 유지
대회 1주 전 (${totalWeeks}주차): 볼륨 60% 감소, 인터벌 없음, easy만

[LSD 거리 기준 — 반드시 이 값을 그대로 사용할 것]
LSD 시작값: ${lsdStartKm}km | LSD 피크: ${lsdPeakKm}km
주차별 LSD 목표 (테이퍼 전 ${buildWeeks}주):
${lsdScheduleText}
테이퍼 1주차(대회 2주 전): LSD 피크 × 0.6
테이퍼 2주차(대회 1주 전): LSD 없음 또는 easy로 대체
`;

  const userMessage = `다음 러너의 정보와 검증 결과를 바탕으로 전체 훈련 플랜을 생성해줘:\n\n${formatRunnerData(body.formData)}\n\n${validationSummary}\n\n현재 VDOT: ${currentVdot} (이 값을 그대로 사용할 것. 재계산 금지)${calculatedPaces}`;

  console.log("[/api/generate-v2] ===== SYSTEM PROMPT =====\n" + GENERATE_PROMPT);
  console.log("[/api/generate-v2] ===== USER MESSAGE =====\n" + userMessage);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 32000,
          messages: [{ role: "user", content: userMessage }],
          system: GENERATE_PROMPT,
        });

        let raw = "";
        for await (const chunk of anthropicStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            raw += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        const finalMsg = await anthropicStream.finalMessage();
        const { input_tokens, output_tokens } = finalMsg.usage;
        const inputCost = (input_tokens / 1_000_000) * 3.0;
        const outputCost = (output_tokens / 1_000_000) * 15.0;
        console.log(
          `[/api/generate-v2] usage — input: ${input_tokens}, output: ${output_tokens}` +
          ` | cost: $${(inputCost + outputCost).toFixed(6)}`
        );

        // 날짜 배정 후처리
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        let v2Plan: V2Plan;
        try {
          v2Plan = JSON.parse(cleaned);
        } catch (e) {
          console.error("[/api/generate-v2] JSON parse failed:", e);
          // 스트리밍은 이미 전송됐으므로 클라이언트가 파싱 실패를 감지
          controller.close();
          return;
        }

        // taper_start_week 강제 오버라이드: 마지막 2주만 테이퍼
        v2Plan.plan_summary.taper_start_week = taperStartWeekNum;

        const finalPlan = assignDatesToPlan(v2Plan, body.formData, today);
        console.log("[/api/generate-v2] 날짜 배정 완료. 주차 수:", finalPlan.weekly_plans.length);

        // 단기 플랜(4주 이하) 주차별 볼륨 캡 강제: base = max(weeklyMileage1, weeklyMileage4/4) × 1.1
        if (isShortPlan) {
          const base = Math.max(
            body.formData.weeklyMileage1,
            body.formData.weeklyMileage4 / 4
          );
          const weekVolumeCap = base * 1.1;
          for (const week of finalPlan.weekly_plans) {
            const activeDays = week.days.filter((d) => !d.is_rest && d.session_type !== "race");
            const weekTotal = activeDays.reduce((sum, d) => sum + (d.distance_km ?? 0), 0);
            if (weekTotal > weekVolumeCap && activeDays.length > 0) {
              const scale = weekVolumeCap / weekTotal;
              for (const day of activeDays) {
                day.distance_km = Math.round(day.distance_km * scale * 10) / 10;
              }
              week.total_distance_km = Math.round(weekVolumeCap * 10) / 10;
              console.log(`[volume-cap] week ${week.week}: ${weekTotal.toFixed(1)}km → ${weekVolumeCap.toFixed(1)}km (scale: ${scale.toFixed(2)})`);
            }
          }
        }

        // 날짜 배정된 최종 플랜을 별도 헤더/트레일러로 전송
        controller.enqueue(encoder.encode("\n__PLAN_WITH_DATES__:" + JSON.stringify(finalPlan)));
        controller.close();
      } catch (err) {
        console.error("[/api/generate-v2] error:", err);
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
