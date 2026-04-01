"use client";

import { CheckIcon } from "lucide-react";
import type { TrainingDay, WorkoutType } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT_COLOR: Record<WorkoutType, string> = {
  easy:      "bg-emerald-400",
  tempo:     "bg-orange-400",
  intervals: "bg-rose-500",
  long:      "bg-violet-500",
  rest:      "bg-muted-foreground/40",
  race:      "bg-yellow-400",
};

const SHORT_LABEL: Record<WorkoutType, string> = {
  easy:      "쉬운",
  tempo:     "템포",
  intervals: "인터벌",
  long:      "롱런",
  rest:      "휴식",
  race:      "대회 🏁",
};

interface CalendarDayCellProps {
  dayNum: number;
  day: TrainingDay | undefined;
  isToday: boolean;
  isRaceDay: boolean;
  isSelected: boolean;
  isCompleted: boolean;
  isOutOfPlan: boolean;
  onSelect: () => void;
  onToggleComplete: (e: React.MouseEvent) => void;
}

export default function CalendarDayCell({
  dayNum,
  day,
  isToday,
  isRaceDay,
  isSelected,
  isCompleted,
  isOutOfPlan,
  onSelect,
  onToggleComplete,
}: CalendarDayCellProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex h-14 w-full flex-col items-start justify-start rounded-lg border p-1.5 text-left transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "bg-accent",
        isToday && "ring-2 ring-primary",
        isRaceDay && "ring-2 ring-yellow-400",
        isOutOfPlan && "opacity-40",
      )}
      aria-label={day ? `${dayNum}일 ${day.description}` : `${dayNum}일`}
      aria-pressed={isSelected}
    >
      {/* Date number */}
      <span className={cn("text-xs font-medium leading-none", isToday && "font-bold text-primary")}>
        {dayNum}
      </span>

      {/* Workout indicator */}
      {day && day.workoutType !== "rest" && (
        <div className="mt-0.5 flex items-center gap-1 min-w-0 w-full">
          <span className={cn("inline-block size-2 shrink-0 rounded-full", DOT_COLOR[day.workoutType])} />
          <span className="truncate text-[10px] text-muted-foreground leading-none">
            {SHORT_LABEL[day.workoutType]}
            {day.distanceKm != null ? ` ${day.distanceKm}km` : ""}
          </span>
        </div>
      )}
      {day && day.workoutType === "rest" && (
        <span className="mt-0.5 text-[10px] text-muted-foreground/60 leading-none">휴식</span>
      )}

      {/* Completion check */}
      {isCompleted && (
        <span
          className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
          onClick={onToggleComplete}
          role="button"
          aria-label="완료 취소"
        >
          <CheckIcon className="size-3" />
        </span>
      )}
    </button>
  );
}
