"use client";

import type { TrainingDay } from "@/lib/types";
import CalendarDayCell from "./CalendarDayCell";

const DAY_HEADERS = ["월", "화", "수", "목", "금", "토", "일"];

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  dayMap: Map<string, TrainingDay>;
  todayStr: string;
  raceDateStr: string;
  planStartStr: string;
  selectedDay: string | null;
  completedDays: Set<string>;
  onSelectDay: (dateStr: string) => void;
  onToggleComplete: (dateStr: string) => void;
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarGrid({
  year,
  month,
  dayMap,
  todayStr,
  raceDateStr,
  planStartStr,
  selectedDay,
  completedDays,
  onSelectDay,
  onToggleComplete,
}: CalendarGridProps) {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const leadingBlanks = (firstDow + 6) % 7; // convert to Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {h}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`blank-${idx}`} className="h-14" />;
          }
          const dateStr = toDateStr(year, month, dayNum);
          // 대회일 이후 날짜는 훈련 데이터가 있어도 빈 셀로 처리
          const day = dateStr > raceDateStr ? undefined : dayMap.get(dateStr);
          const isOutOfPlan = dateStr < planStartStr || dateStr > raceDateStr;

          return (
            <CalendarDayCell
              key={dateStr}
              dayNum={dayNum}
              day={day}
              isToday={dateStr === todayStr}
              isRaceDay={dateStr === raceDateStr}
              isPlanStartDay={dateStr === planStartStr}
              isSelected={selectedDay === dateStr}
              isCompleted={completedDays.has(dateStr)}
              isOutOfPlan={isOutOfPlan}
              onSelect={() => onSelectDay(dateStr)}
              onToggleComplete={(e) => {
                e.stopPropagation();
                onToggleComplete(dateStr);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
