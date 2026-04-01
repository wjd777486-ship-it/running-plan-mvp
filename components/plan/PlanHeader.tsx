import type { GeneratedPlanSummary } from "@/lib/types";

const RACE_LABELS: Record<string, string> = {
  "5k": "5K", "10k": "10K", half: "하프마라톤", full: "풀마라톤",
};

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function calcDday(raceDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(raceDateStr + "T00:00:00");
  return Math.round((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PlanHeader({ summary }: { summary: GeneratedPlanSummary }) {
  const dday = calcDday(summary.goal_date);
  const raceLabel = RACE_LABELS[summary.goal_race] ?? summary.goal_race;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-4 items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">대회 목표</p>
        <p className="text-xl font-bold">
          {raceLabel}
          {summary.goal_time ? ` · ${summary.goal_time}` : ""}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatKoreanDate(summary.goal_date)}
        </p>
      </div>

      <div className="flex gap-6 text-center">
        <div>
          <p className="text-2xl font-bold tabular-nums">D-{dday}</p>
          <p className="text-xs text-muted-foreground">남은 날</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{summary.total_weeks}</p>
          <p className="text-xs text-muted-foreground">총 주</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{summary.total_sessions}</p>
          <p className="text-xs text-muted-foreground">총 세션</p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm text-muted-foreground">총 거리</p>
        <p className="text-lg font-semibold">{summary.total_distance_km}km</p>
        <p className="text-sm text-muted-foreground">피크 주 {summary.peak_weekly_distance_km}km</p>
      </div>
    </div>
  );
}
