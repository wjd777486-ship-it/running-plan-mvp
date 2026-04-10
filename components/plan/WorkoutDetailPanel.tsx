"use client";

import type { TrainingDay, WorkoutType, Phase } from "@/lib/types";

// ── Design tokens (Figma) ────────────────────────────────────────────────────

const BADGE: Record<WorkoutType, { bg: string; color: string; label: string }> = {
  easy:      { bg: "#DCFCE7", color: "#008236", label: "조깅" },
  tempo:     { bg: "#FFEDD4", color: "#CA3500", label: "템포런" },
  intervals: { bg: "#FFE2E2", color: "#C10007", label: "인터벌" },
  long:      { bg: "#F3E8FF", color: "#8200DB", label: "LSD" },
  rest:      { bg: "#F3F4F6", color: "#364153", label: "휴식" },
  race:      { bg: "#FEF3C7", color: "#D97706", label: "대회" },
};

const WORKOUT_TITLE: Record<WorkoutType, string> = {
  easy:      "이지런",
  tempo:     "템포런",
  intervals: "인터벌",
  long:      "장거리",
  rest:      "휴식",
  race:      "대회",
};

const PHASE_LABEL: Record<Phase, string> = {
  base:  "기초 단계",
  build: "빌드업 단계",
  peak:  "피크 단계",
  taper: "테이퍼 단계",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

function normalizeHrZone(zone: string): string {
  // "Z1~Z2" → "Zone 1~2", "Z2" → "Zone 2", "Zone 1~Zone 2" → "Zone 1~2"
  return zone
    .replace(/Z(\d+)~Z(\d+)/g, "Zone $1~$2")
    .replace(/Zone (\d+)~Zone (\d+)/g, "Zone $1~$2")
    .replace(/Z(\d+)/g, "Zone $1");
}

type PaceRow = { label: string; dist: string; pace: string };

function buildPaceRows(day: TrainingDay): PaceRow[] {
  const rows: PaceRow[] = [];

  if (day.workoutType === "intervals") {
    if (day.warmup) {
      rows.push({ label: "워밍업", dist: `${day.warmup.distance_km}km`, pace: day.warmup.pace });
    }
    if (day.sets) {
      let distLabel = "-";
      if (day.sets.rep_distance_m != null && day.sets.rep_count != null) {
        const distStr = day.sets.rep_distance_m >= 1000
          ? `${day.sets.rep_distance_m / 1000}km`
          : `${day.sets.rep_distance_m}m`;
        distLabel = `${distStr}*${day.sets.rep_count}set`;
      }
      rows.push({ label: "인터벌", dist: distLabel, pace: day.sets.rep_pace ?? "-" });
      if (day.sets.recovery_method || day.sets.recovery_pace) {
        rows.push({
          label: "세트 간 회복",
          dist: day.sets.recovery_method ?? "-",
          pace: day.sets.recovery_pace ?? "-",
        });
      }
    }
    if (day.cooldown) {
      rows.push({ label: "쿨다운", dist: `${day.cooldown.distance_km}km`, pace: day.cooldown.pace });
    }
  } else if (day.workoutType === "tempo") {
    if (day.warmup) {
      rows.push({ label: "워밍업", dist: `${day.warmup.distance_km}km`, pace: day.warmup.pace });
    }
    if (day.tempoSegment) {
      rows.push({ label: "메인", dist: `${day.tempoSegment.distance_km}km`, pace: day.tempoSegment.pace });
    }
    if (day.cooldown) {
      rows.push({ label: "쿨다운", dist: `${day.cooldown.distance_km}km`, pace: day.cooldown.pace });
    }
  } else {
    // easy / long / race
    if (day.warmup) {
      rows.push({ label: "워밍업", dist: `${day.warmup.distance_km}km`, pace: day.warmup.pace });
    }
    if (day.paceTarget) {
      rows.push({
        label: "메인",
        dist: day.distanceKm != null ? `${day.distanceKm}km` : "-",
        pace: day.paceTarget,
      });
    }
    if (day.cooldown) {
      rows.push({ label: "쿨다운", dist: `${day.cooldown.distance_km}km`, pace: day.cooldown.pace });
    }
  }

  return rows;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
      <span style={{ fontWeight: 500, fontSize: 15, lineHeight: "1.19em", color: "#6A7282" }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.19em", color: valueColor ?? "#0A0A0A" }}>
        {value}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const REST_CARD_STYLE = {
  borderRadius: 14,
  border: "1px solid rgba(60, 60, 67, 0.18)",
  padding: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 20,
  backgroundColor: "#FFFFFF",
};

function RestCard({ title, description }: { title: string; description: string }) {
  return (
    <div style={REST_CARD_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 17, lineHeight: "1.45em", letterSpacing: "-0.0254em", color: "#0A0A0A" }}>
          {title}
        </span>
        <span
          style={{
            backgroundColor: BADGE.rest.bg,
            color: BADGE.rest.color,
            borderRadius: 9999,
            padding: "6px 10px",
            fontWeight: 500,
            fontSize: 13,
            lineHeight: "1.19em",
            letterSpacing: "-0.0059em",
            flexShrink: 0,
          }}
        >
          {BADGE.rest.label}
        </span>
      </div>
      <p
        style={{
          fontWeight: 500,
          fontSize: 15,
          lineHeight: "1.5em",
          letterSpacing: "-0.015625em",
          color: "#4A5565",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

interface WorkoutDetailPanelProps {
  day: TrainingDay | null;
  isCompleted: boolean;
  onToggleComplete: (dateStr: string) => void;
  todayStr?: string;
  raceDateStr?: string;
  selectedDateStr?: string;
}

export default function WorkoutDetailPanel({
  day,
  isCompleted,
  onToggleComplete,
  todayStr,
  raceDateStr,
  selectedDateStr,
}: WorkoutDetailPanelProps) {
  // Compute day-before-race string to exclude it from the rest/null UI
  let preDayStr: string | null = null;
  if (raceDateStr) {
    const rd = new Date(raceDateStr + "T00:00:00");
    rd.setDate(rd.getDate() - 1);
    preDayStr = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}-${String(rd.getDate()).padStart(2, "0")}`;
  }

  if (!day) {
    const title = selectedDateStr === preDayStr ? "대회 전날 휴식" : "휴식";
    return <RestCard title={title} description="체력을 회복하고 컨디션을 조절하세요." />;
  }

  const badge = BADGE[day.workoutType];
  const isToday = todayStr ? day.date === todayStr : false;
  const isFuture = todayStr ? day.date > todayStr : false;
  const isRest = day.workoutType === "rest";
  const paceRows = buildPaceRows(day);

  if (isRest) {
    return (
      <RestCard
        title={day.title ?? day.description ?? "휴식"}
        description={day.notes || "체력을 회복하고 컨디션을 조절하세요."}
      />
    );
  }

  return (
    <div
      className="bg-white"
      style={{
        borderRadius: 14,
        border: "1px solid rgba(60, 60, 67, 0.18)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 30,
      }}
    >
      {/* ── Header: title + phase + badge ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 17,
                lineHeight: "1.45em",
                letterSpacing: "-0.0254em",
                color: "#0A0A0A",
              }}
            >
              {WORKOUT_TITLE[day.workoutType]}
            </span>
            {isToday && (
              <span
                className="rounded-full bg-primary text-primary-foreground"
                style={{ padding: "2px 8px", fontSize: 12, fontWeight: 600 }}
              >
                오늘
              </span>
            )}
          </div>
          <span
            style={{
              fontWeight: 500,
              fontSize: 13,
              lineHeight: "1.19em",
              letterSpacing: "-0.0332em",
              color: "#6A7282",
            }}
          >
            {PHASE_LABEL[day.phase]}
          </span>
        </div>
        <span
          style={{
            backgroundColor: badge.bg,
            color: badge.color,
            borderRadius: 9999,
            padding: "6px 10px",
            fontWeight: 500,
            fontSize: 13,
            lineHeight: "1.19em",
            letterSpacing: "-0.0059em",
            flexShrink: 0,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* ── Workout sections ── */}
      {(
        /* ── Sections frame (gap 28px) ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* 훈련 정보 */}
          {(day.distanceKm || day.hrZone || day.durationMin) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  lineHeight: "1.5em",
                  letterSpacing: "-0.015625em",
                  color: "#4A5565",
                }}
              >
                훈련 정보
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {day.distanceKm != null && day.distanceKm > 0 && (
                  <InfoRow label="총 거리" value={`${day.distanceKm}km`} valueColor="#0088FF" />
                )}
                {day.hrZone && (
                  <InfoRow label="HR 존" value={normalizeHrZone(day.hrZone)} />
                )}
                {day.durationMin != null && day.durationMin > 0 && (
                  <InfoRow label="예상 훈련 시간" value={formatDuration(day.durationMin)} />
                )}
              </div>
            </div>
          )}

          {/* 구간별 페이스 */}
          {paceRows.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  lineHeight: "1.5em",
                  letterSpacing: "-0.015625em",
                  color: "#4A5565",
                }}
              >
                구간별 페이스
              </span>
              <div>
                {/* Table header */}
                <div style={{ display: "flex", height: 35.5, alignItems: "center" }}>
                  <span
                    style={{
                      width: 102,
                      paddingLeft: 8,
                      fontWeight: 500,
                      fontSize: 15,
                      lineHeight: "1.3em",
                      color: "#6A7282",
                    }}
                  >
                    구간
                  </span>
                  <span
                    style={{
                      width: 72,
                      fontWeight: 500,
                      fontSize: 15,
                      lineHeight: "1.3em",
                      color: "#6A7282",
                      textAlign: "center",
                    }}
                  >
                    거리(km)
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontWeight: 500,
                      fontSize: 15,
                      lineHeight: "1.3em",
                      color: "#6A7282",
                      textAlign: "center",
                    }}
                  >
                    페이스(km당)
                  </span>
                </div>
                {/* Table rows */}
                {paceRows.map((row, i) => (
                  <div key={i} style={{ display: "flex", height: 37, alignItems: "center" }}>
                    <span
                      style={{
                        width: 102,
                        paddingLeft: 8,
                        fontWeight: 500,
                        fontSize: 15,
                        lineHeight: "1.4em",
                        color: "#6A7282",
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        width: 72,
                        fontWeight: 600,
                        fontSize: 15,
                        lineHeight: "1.4em",
                        color: "#0A0A0A",
                        textAlign: "center",
                      }}
                    >
                      {row.dist}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: 15,
                        lineHeight: "1.4em",
                        color: "#0A0A0A",
                        textAlign: "center",
                      }}
                    >
                      {row.pace.replace(/\/km$/, "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA button */}
          <button
            type="button"
            onClick={() => { if (!isFuture) onToggleComplete(day.date); }}
            style={{
              width: "100%",
              height: 57.5,
              borderRadius: 14,
              border: "none",
              backgroundColor: isCompleted ? "#F3F4F6" : isFuture ? "#F3F4F6" : "#0088FF",
              color: isCompleted ? "#99A1AF" : isFuture ? "#99A1AF" : "#FFFFFF",
              fontWeight: 600,
              fontSize: 18,
              lineHeight: "1.42em",
              letterSpacing: "-0.0240em",
              cursor: isFuture && !isCompleted ? "default" : "pointer",
            }}
          >
            {isCompleted ? "✓ 훈련 완료" : isFuture ? "훈련 예정" : "훈련 완료하기"}
          </button>

        </div>
      )}
    </div>
  );
}
