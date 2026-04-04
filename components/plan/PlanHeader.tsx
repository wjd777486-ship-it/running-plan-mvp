import type { GeneratedPlanSummary, TrainingDay } from "@/lib/types";

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

function getTodayStr(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
}

interface PlanHeaderProps {
  summary: GeneratedPlanSummary;
  dayMap: Map<string, TrainingDay>;
  planStartStr: string;
  completedDays: Set<string>;
}

export default function PlanHeader({ summary, dayMap, planStartStr, completedDays }: PlanHeaderProps) {
  const dday = calcDday(summary.goal_date);
  const raceDateStr = summary.goal_date;
  const todayStr = getTodayStr();

  const totalWeeks = dday >= 7 ? Math.floor(dday / 7) : 0;
  const daysSinceStart = Math.max(0, Math.round(
    (new Date(todayStr + "T00:00:00").getTime() - new Date(planStartStr + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)
  ));
  const currentWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks || 1);

  let totalSessions = 0;
  let totalDistanceKm = 0;
  let accumulatedDistanceKm = 0;
  let completedSessions = 0;

  for (const [dateStr, day] of dayMap) {
    if (day.workoutType !== "rest") {
      totalSessions++;
      if (completedDays.has(dateStr)) completedSessions++;
    }
    if (day.distanceKm != null && dateStr <= raceDateStr) {
      totalDistanceKm += day.distanceKm;
    }
    if (completedDays.has(dateStr) && day.distanceKm != null) {
      accumulatedDistanceKm += day.distanceKm;
    }
  }

  const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const progressWidth = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Title */}
      <div style={{ padding: "0 20px 20px" }}>
        <h1
          style={{
            fontWeight: 600,
            fontSize: 28,
            lineHeight: "1.3em",
            letterSpacing: "-0.0054em",
            color: "#000000",
            margin: 0,
          }}
        >
          목표한 대회까지
          <br />
          <span style={{ color: "#0088FF" }}>{dday}</span>일 남았어요
        </h1>
      </div>

      {/* Stats card */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid rgba(60,60,67,0.18)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* Race date / D-day */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 500, fontSize: 15, lineHeight: "1.19em", letterSpacing: "-0.005em", color: "#6A7282" }}>
            {formatKoreanDate(raceDateStr)}까지
          </span>
          <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.19em", letterSpacing: "0.0255em", color: "#0088FF" }}>
            D-{dday}
          </span>
        </div>

        {/* Goal time */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 500, fontSize: 15, lineHeight: "1.19em", color: "#6A7282" }}>
            목표 기록
          </span>
          <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.19em", color: "#0088FF" }}>
            {summary.goal_time}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "#E5E7EB", margin: "0 -20px", width: "calc(100% + 40px)" }} />

        {/* 주차 / 훈련 / 거리 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 13, lineHeight: "1.5em", letterSpacing: "-0.006em", color: "#6A7282" }}>주차</span>
            <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.7em", letterSpacing: "-0.029em", color: "#0A0A0A" }}>
              {currentWeek}/{totalWeeks}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 13, lineHeight: "1.5em", letterSpacing: "-0.006em", color: "#6A7282" }}>훈련</span>
            <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.7em", letterSpacing: "-0.029em", color: "#0A0A0A" }}>
              {completedSessions}/{totalSessions}회
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 13, lineHeight: "1.5em", letterSpacing: "-0.006em", color: "#6A7282" }}>누적/총 거리</span>
            <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.7em", letterSpacing: "-0.029em", color: "#0A0A0A" }}>
              {Math.round(accumulatedDistanceKm)}/{Math.round(totalDistanceKm)}km
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "#E5E7EB", margin: "0 -20px", width: "calc(100% + 40px)" }} />

        {/* Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 500, fontSize: 15, lineHeight: "1.3em", letterSpacing: "-0.005em", color: "#6A7282" }}>
              훈련 진행률
            </span>
            <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.3em", letterSpacing: "-0.005em", color: "#6A7282" }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 9999, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressWidth}%`,
                backgroundColor: "#0088FF",
                borderRadius: 9999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
