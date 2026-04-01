// ── 기존 타입 (캘린더 렌더링용) ──────────────────────────────────────────────
export type RaceType = "5k" | "10k" | "half" | "full";
export type WorkoutType = "rest" | "easy" | "tempo" | "intervals" | "long" | "race";
export type Phase = "base" | "build" | "peak" | "taper";

export interface OnboardingParams {
  raceDate: string;        // YYYY-MM-DD
  raceType: RaceType;
  goalTime: string;        // "" if absent
  currentPace: string;     // "M:SS"
  weeklyFrequency: number; // 2–6
}

export interface TrainingPaces {
  easy: string;
  tempo: string;
  intervals: string;
  long: string;
}

export interface TrainingDay {
  date: string;            // YYYY-MM-DD
  workoutType: WorkoutType;
  phase: Phase;
  distanceKm: number | null;
  paceTarget: string | null;
  description: string;
  notes: string;
  // AI 생성 플랜 추가 필드 (선택)
  title?: string;
  hrZone?: string;
  durationMin?: number;
  purpose?: string;
  sets?: {
    rep_distance_m?: number;
    rep_count?: number;
    recovery_method?: string;
  } | null;
}

export interface PhaseRange {
  phase: Phase;
  startDate: string;
  endDate: string;
}

export interface TrainingPlan {
  params: OnboardingParams;
  paces: TrainingPaces;
  days: TrainingDay[];
  totalWeeks: number;
  phases: PhaseRange[];
}

export interface PlanRecord {
  id: string;
  user_id: string;
  race_date: string;
  race_type: RaceType;
  goal_time: string | null;
  current_pace: string | null;
  weekly_frequency: number | null;
  form_data: RunnerFormData | null;
  generated_plan: GeneratedPlan | null;
  created_at: string;
}

// ── 온보딩 폼 데이터 ───────────────────────────────────────────────────────
export interface RunnerFormData {
  // 목표
  raceType: RaceType;
  raceDate: string;
  goalHours: number;
  goalMinutes: number;
  pbHours: number;
  pbMinutes: number;
  pbSeconds: number;
  noPb: boolean;
  // 기본 정보
  gender: "male" | "female";
  age: number;
  expYears: number;
  expMonths: number;
  // 러닝 현황
  weeklyMileage1: number;
  weeklyMileage4: number;
  maxRunDistance: number;
  trainingDays: string[]; // ["mon","tue",...]
  // 조깅 (HR < 140)
  joggingDist: number;
  joggingPaceMin: number;
  joggingPaceSec: number;
  joggingHr: number;
  joggingCadence: number | null;
  // 러닝 (HR >= 140)
  runningDist: number;
  runningPaceMin: number;
  runningPaceSec: number;
  runningHr: number;
  runningCadence: number | null;
}

// ── Anthropic API 응답 타입 ────────────────────────────────────────────────
export interface ValidationJudgment {
  judgment: "PASS" | "WARN" | "FAIL";
  message: string;
}

export interface ValidationResult {
  validation: {
    status: "GREEN" | "YELLOW" | "RED";
    vdot: {
      estimated_current: number;
      required_for_goal: number;
      gap: number;
    } & ValidationJudgment;
    training_period: {
      total_weeks: number;
      weeks_needed_for_volume: number;
    } & ValidationJudgment;
    max_run_distance: {
      current_max_km: number;
      recommended_min_km: number;
    } & ValidationJudgment;
    realistic_goal: {
      suggested_time: string | null;
      message: string;
    };
  };
}

export interface GeneratedDaySets {
  rep_distance_m?: number;
  rep_count?: number;
  recovery_method?: string;
}

export interface GeneratedDay {
  date: string;
  day_of_week: string;
  session_type: "easy" | "interval" | "tempo" | "lsd" | "rest" | "race";
  title: string;
  distance_km: number;
  pace_target: string;
  hr_zone: string;
  duration_min: number;
  sets: GeneratedDaySets | null;
  description: string;
  purpose: string;
  is_rest: boolean;
}

export interface GeneratedWeek {
  week: number;
  theme: string;
  total_distance_km: number;
  days: GeneratedDay[];
}

export interface GeneratedPlanSummary {
  goal_race: string;
  goal_date: string;
  goal_time: string;
  total_weeks: number;
  total_sessions: number;
  total_distance_km: number;
  peak_weekly_distance_km: number;
  taper_start_date: string;
  stats: {
    total_easy_runs: number;
    total_interval_sessions: number;
    total_tempo_sessions: number;
    total_lsd_sessions: number;
    longest_run_km: number;
    fastest_pace_target: string;
    slowest_pace_target: string;
  };
}

export interface GeneratedPlan {
  plan_summary: GeneratedPlanSummary;
  weekly_plans: GeneratedWeek[];
}
