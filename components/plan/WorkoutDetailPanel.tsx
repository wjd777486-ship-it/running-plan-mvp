"use client";

import type { TrainingDay, WorkoutType, Phase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DOT_COLOR: Record<WorkoutType, string> = {
  easy:      "bg-emerald-400",
  tempo:     "bg-orange-400",
  intervals: "bg-rose-500",
  long:      "bg-violet-500",
  rest:      "bg-muted-foreground/40",
  race:      "bg-yellow-400",
};

const PHASE_LABEL: Record<Phase, string> = {
  base:  "기초",
  build: "빌드업",
  peak:  "피크",
  taper: "테이퍼",
};

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;
}

interface WorkoutDetailPanelProps {
  day: TrainingDay | null;
  isCompleted: boolean;
  onToggleComplete: (dateStr: string) => void;
}

export default function WorkoutDetailPanel({ day, isCompleted, onToggleComplete }: WorkoutDetailPanelProps) {
  if (!day) {
    return (
      <div className="rounded-xl border bg-card p-6 flex items-center justify-center text-sm text-muted-foreground min-h-[200px]">
        날짜를 클릭하면 훈련 상세를 볼 수 있어요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Date + phase */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-base">{formatDate(day.date)}</p>
          <span className="inline-block mt-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {PHASE_LABEL[day.phase]} 단계
          </span>
        </div>
        {day.workoutType !== "rest" && (
          <span className={cn("inline-block size-3 rounded-full mt-1", DOT_COLOR[day.workoutType])} />
        )}
      </div>

      {/* Title + pace */}
      <div>
        <p className="text-lg font-bold">{day.title ?? day.description}</p>
        {day.paceTarget && (
          <p className="text-sm text-muted-foreground mt-0.5">목표 페이스: {day.paceTarget}</p>
        )}
        {day.hrZone && (
          <p className="text-sm text-muted-foreground">HR 존: {day.hrZone}</p>
        )}
        {day.durationMin != null && day.durationMin > 0 && (
          <p className="text-sm text-muted-foreground">예상 시간: {day.durationMin}분</p>
        )}
      </div>

      {/* Sets (intervals) */}
      {day.sets && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-0.5">
          {day.sets.rep_distance_m != null && day.sets.rep_count != null && (
            <p className="font-medium">
              {day.sets.rep_distance_m}m × {day.sets.rep_count}세트
            </p>
          )}
          {day.sets.recovery_method && (
            <p className="text-muted-foreground">회복: {day.sets.recovery_method}</p>
          )}
        </div>
      )}

      {/* Description / purpose */}
      {day.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-3">
          {day.notes}
        </p>
      )}
      {day.purpose && day.purpose !== day.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed italic">
          목적: {day.purpose}
        </p>
      )}

      {/* Complete button */}
      {day.workoutType !== "rest" && (
        <Button
          variant={isCompleted ? "default" : "outline"}
          className="w-full gap-2"
          onClick={() => onToggleComplete(day.date)}
        >
          {isCompleted ? (
            <>
              <CheckIcon className="size-4" />
              완료됨
            </>
          ) : (
            "완료로 표시"
          )}
        </Button>
      )}
    </div>
  );
}
