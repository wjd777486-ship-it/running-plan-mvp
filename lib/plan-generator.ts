import type {
  OnboardingParams,
  TrainingPlan,
  TrainingDay,
  PhaseRange,
  WorkoutType,
  Phase,
  RaceType,
} from "./types";
import { deriveTrainingPaces, formatPace } from "./pace-utils";

// ── Phase ratios by race type ──────────────────────────────────────────────
const PHASE_RATIOS: Record<RaceType, [number, number, number, number]> = {
  //              [base, build, peak, taper]
  "5k":   [0.30, 0.35, 0.20, 0.15],
  "10k":  [0.30, 0.40, 0.20, 0.10],
  half:   [0.35, 0.40, 0.15, 0.10],
  full:   [0.40, 0.40, 0.10, 0.10],
};

const MIN_TAPER_WEEKS: Record<RaceType, number> = {
  "5k": 1, "10k": 1, half: 2, full: 3,
};

// ── Weekly template: dayOfWeek (0=Sun…6=Sat) → WorkoutType ─────────────────
// null means rest
type WeekTemplate = Record<number, WorkoutType | null>;

const WEEKLY_TEMPLATES: Record<number, WeekTemplate> = {
  2: { 0: "long", 4: "easy" },                                    // Sun, Thu
  3: { 0: "long", 2: "easy", 4: "easy" },                        // Sun, Tue, Thu
  4: { 0: "long", 2: "easy", 4: "tempo", 6: "easy" },            // Sun, Tue, Thu, Sat
  5: { 0: "long", 2: "easy", 3: "tempo", 4: "easy", 6: "easy" }, // Sun, Tue, Wed, Thu, Sat
  6: { 0: "long", 2: "easy", 3: "tempo", 4: "easy", 5: "intervals", 6: "easy" },
};

// ── Peak distances (km) by workout type and race type ─────────────────────
const PEAK_DISTANCE: Record<Exclude<WorkoutType, "rest" | "race">, Record<RaceType, number>> = {
  long:      { "5k": 12, "10k": 16, half: 21, full: 32 },
  tempo:     { "5k": 5,  "10k": 8,  half: 12, full: 16 },
  easy:      { "5k": 5,  "10k": 6,  half: 8,  full: 10 },
  intervals: { "5k": 4,  "10k": 5,  half: 6,  full: 8  },
};

const RACE_DISTANCE_KM: Record<RaceType, number> = {
  "5k": 5, "10k": 10, half: 21.1, full: 42.2,
};

// ── Korean labels ──────────────────────────────────────────────────────────
const WORKOUT_LABELS: Record<WorkoutType, (km?: number) => string> = {
  rest:      () => "휴식",
  easy:      (km) => `쉬운 달리기 ${km}km`,
  tempo:     (km) => `템포런 ${km}km`,
  intervals: (km) => `인터벌 ${km}km`,
  long:      (km) => `롱런 ${km}km`,
  race:      (km) => `대회 당일 🏁 ${km}km`,
};

const WORKOUT_NOTES: Record<WorkoutType, Record<Phase, string>> = {
  rest: {
    base:  "충분한 휴식으로 회복하세요.",
    build: "충분한 휴식으로 회복하세요.",
    peak:  "충분한 휴식으로 회복하세요.",
    taper: "몸을 완전히 회복시키세요.",
  },
  easy: {
    base:  "대화할 수 있는 편안한 속도로 유지하세요.",
    build: "편안하게 달리되 자세에 집중하세요.",
    peak:  "가볍게 달리며 컨디션을 유지하세요.",
    taper: "아주 가볍게, 다리를 풀어주는 느낌으로 달리세요.",
  },
  tempo: {
    base:  "불편하지만 유지 가능한 페이스를 경험해보세요.",
    build: "목표 페이스보다 약간 빠르게, 꾸준히 유지하세요.",
    peak:  "레이스 페이스로 자신감을 키우세요.",
    taper: "짧고 강하게. 몸에 자극만 주세요.",
  },
  intervals: {
    base:  "400m 반복 후 충분히 회복 조깅하세요.",
    build: "강도를 높여 각 반복 구간을 전력으로 달리세요.",
    peak:  "레이스 페이스 이상으로 달리며 속도 감각을 익히세요.",
    taper: "짧은 인터벌로 몸을 깨워주세요. 무리하지 마세요.",
  },
  long: {
    base:  "끝까지 편안한 속도를 유지하세요. 거리 적응이 목표입니다.",
    build: "마지막 3km는 목표 페이스로 달려보세요.",
    peak:  "레이스 시뮬레이션. 보급과 페이스 전략을 연습하세요.",
    taper: "가볍게 달려 자신감을 유지하세요.",
  },
  race: {
    base:  "오늘이 대회 날입니다. 최선을 다하세요!",
    build: "오늘이 대회 날입니다. 최선을 다하세요!",
    peak:  "오늘이 대회 날입니다. 최선을 다하세요!",
    taper: "오늘이 대회 날입니다. 최선을 다하세요!",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function phaseMultiplier(phase: Phase, weekIndex: number, totalWeeksInPhase: number, taperWeekIndex: number): number {
  switch (phase) {
    case "base": {
      const pct = totalWeeksInPhase > 1 ? weekIndex / (totalWeeksInPhase - 1) : 1;
      return 0.60 + pct * 0.20; // 0.60 → 0.80
    }
    case "build": {
      const pct = totalWeeksInPhase > 1 ? weekIndex / (totalWeeksInPhase - 1) : 1;
      return 0.80 + pct * 0.20; // 0.80 → 1.00
    }
    case "peak":
      return 1.0;
    case "taper":
      return Math.max(0.50, 0.75 - taperWeekIndex * 0.125);
    default:
      return 0.7;
  }
}

// ── Main generator ─────────────────────────────────────────────────────────
export function generateTrainingPlan(params: OnboardingParams): TrainingPlan {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const raceDate = new Date(params.raceDate + "T00:00:00");

  const totalDays = diffDays(today, raceDate);
  const totalWeeks = Math.max(1, Math.floor(totalDays / 7));

  const paces = deriveTrainingPaces(params.currentPace);
  const ratios = PHASE_RATIOS[params.raceType];
  const minTaper = MIN_TAPER_WEEKS[params.raceType];

  // Calculate phase week counts
  const taperWeeks = Math.max(minTaper, Math.round(totalWeeks * ratios[3]));
  const remaining = totalWeeks - taperWeeks;
  const peakWeeks = Math.max(1, Math.round(remaining * (ratios[2] / (ratios[0] + ratios[1] + ratios[2]))));
  const remaining2 = remaining - peakWeeks;
  const buildWeeks = Math.max(1, Math.round(remaining2 * (ratios[1] / (ratios[0] + ratios[1]))));
  const baseWeeks = Math.max(1, remaining2 - buildWeeks);

  // Build phase ranges
  const phases: PhaseRange[] = [];
  let cursor = new Date(today);

  const pushPhase = (phase: Phase, weeks: number) => {
    const start = toDateStr(cursor);
    const end = toDateStr(addDays(cursor, weeks * 7 - 1));
    phases.push({ phase, startDate: start, endDate: end });
    cursor = addDays(cursor, weeks * 7);
  };

  pushPhase("base", baseWeeks);
  pushPhase("build", buildWeeks);
  pushPhase("peak", peakWeeks);
  pushPhase("taper", taperWeeks);

  // Lookup functions
  const getPhase = (dateStr: string): Phase => {
    for (const p of phases) {
      if (dateStr >= p.startDate && dateStr <= p.endDate) return p.phase;
    }
    return "taper";
  };

  const getPhaseWeekIndex = (dateStr: string, phase: Phase): { weekIndex: number; totalWeeks: number } => {
    const range = phases.find((p) => p.phase === phase);
    if (!range) return { weekIndex: 0, totalWeeks: 1 };
    const days = diffDays(new Date(range.startDate), new Date(dateStr));
    return {
      weekIndex: Math.floor(days / 7),
      totalWeeks: Math.round(diffDays(new Date(range.startDate), new Date(range.endDate)) / 7) + 1,
    };
  };

  const getTaperWeekIndex = (dateStr: string): number => {
    const taperRange = phases.find((p) => p.phase === "taper");
    if (!taperRange) return 0;
    return Math.floor(diffDays(new Date(taperRange.startDate), new Date(dateStr)) / 7);
  };

  const template = WEEKLY_TEMPLATES[params.weeklyFrequency] ?? WEEKLY_TEMPLATES[3];

  // Generate days
  const days: TrainingDay[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const date = addDays(today, d);
    const dateStr = toDateStr(date);
    const isRaceDay = dateStr === params.raceDate;

    if (isRaceDay) {
      const km = RACE_DISTANCE_KM[params.raceType];
      days.push({
        date: dateStr,
        workoutType: "race",
        phase: "taper",
        distanceKm: km,
        paceTarget: params.goalTime || null,
        description: WORKOUT_LABELS.race(km),
        notes: WORKOUT_NOTES.race.taper,
      });
      continue;
    }

    const phase = getPhase(dateStr);
    const dow = date.getDay(); // 0=Sun
    const workoutType: WorkoutType = template[dow] ?? "rest";

    if (workoutType === "rest") {
      days.push({
        date: dateStr,
        workoutType: "rest",
        phase,
        distanceKm: null,
        paceTarget: null,
        description: WORKOUT_LABELS.rest(),
        notes: WORKOUT_NOTES.rest[phase],
      });
      continue;
    }

    const { weekIndex, totalWeeks: weeksInPhase } = getPhaseWeekIndex(dateStr, phase);
    const taperWI = phase === "taper" ? getTaperWeekIndex(dateStr) : 0;
    const multiplier = phaseMultiplier(phase, weekIndex, weeksInPhase, taperWI);

    const peakKm = PEAK_DISTANCE[workoutType as keyof typeof PEAK_DISTANCE]?.[params.raceType] ?? 5;
    const km = Math.max(1, Math.round(peakKm * multiplier));

    const paceKey = workoutType as keyof typeof paces;
    const paceTarget = paces[paceKey] ?? null;

    days.push({
      date: dateStr,
      workoutType,
      phase,
      distanceKm: km,
      paceTarget,
      description: WORKOUT_LABELS[workoutType](km),
      notes: WORKOUT_NOTES[workoutType][phase],
    });
  }

  return {
    params,
    paces,
    days,
    totalWeeks,
    phases,
  };
}

export function parseOnboardingParams(
  raw: Record<string, string | string[] | undefined>
): OnboardingParams | null {
  const get = (key: string): string => {
    const v = raw[key];
    return Array.isArray(v) ? v[0] : v ?? "";
  };

  const raceDate = get("raceDate");
  const raceType = get("raceType") as OnboardingParams["raceType"];
  const goalTime = get("goalTime");
  const currentPace = get("currentPace");
  const weeklyFrequency = parseInt(get("weeklyFrequency"), 10);

  if (!raceDate || !raceType || !currentPace || isNaN(weeklyFrequency)) return null;
  if (!["5k", "10k", "half", "full"].includes(raceType)) return null;
  if (!/^\d{1,2}:\d{2}$/.test(currentPace)) return null;
  if (weeklyFrequency < 2 || weeklyFrequency > 6) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(raceDate + "T00:00:00");
  if (race <= today) return null;

  return { raceDate, raceType, goalTime, currentPace, weeklyFrequency };
}

export { formatPace };
