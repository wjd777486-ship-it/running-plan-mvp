"use client";

import { useState, useEffect, useMemo } from "react";
import type { GeneratedPlan, TrainingDay, WorkoutType, Phase } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import PlanHeader from "./PlanHeader";
import MonthNav from "./MonthNav";
import CalendarGrid from "./CalendarGrid";
import WorkoutDetailPanel from "./WorkoutDetailPanel";
import WorkoutTypeLegend from "./WorkoutTypeLegend";

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

const SESSION_TYPE_MAP: Record<string, WorkoutType> = {
  easy: "easy",
  interval: "intervals",
  tempo: "tempo",
  lsd: "long",
  rest: "rest",
  race: "race",
};

function computePhase(weekNum: number, totalWeeks: number): Phase {
  const pct = weekNum / totalWeeks;
  if (pct < 0.4) return "base";
  if (pct < 0.75) return "build";
  if (pct < 0.9) return "peak";
  return "taper";
}

function buildDayMap(plan: GeneratedPlan): Map<string, TrainingDay> {
  const map = new Map<string, TrainingDay>();
  const totalWeeks = plan.weekly_plans.length;

  for (const week of plan.weekly_plans) {
    const phase = computePhase(week.week, totalWeeks);
    for (const day of week.days) {
      const workoutType = SESSION_TYPE_MAP[day.session_type] ?? "rest";
      const td: TrainingDay = {
        date: day.date,
        workoutType,
        phase,
        distanceKm: day.is_rest ? null : day.distance_km,
        paceTarget: day.pace_target || null,
        description: day.title || day.description,
        notes: day.description,
        title: day.title,
        hrZone: day.hr_zone,
        durationMin: day.duration_min,
        purpose: day.purpose,
        sets: day.sets,
      };
      map.set(day.date, td);
    }
  }

  return map;
}

interface PlanShellProps {
  generatedPlan: GeneratedPlan;
  planId: string;
}

export default function PlanShell({ generatedPlan, planId }: PlanShellProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const raceDate = new Date(generatedPlan.plan_summary.goal_date + "T00:00:00");
  const planStartStr = todayStr;

  const [viewMonth, setViewMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(todayStr);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("completions")
      .select("date")
      .eq("plan_id", planId)
      .then(({ data }) => {
        if (data) {
          setCompletedDays(new Set(data.map((r: { date: string }) => r.date)));
        }
      });
  }, [planId]);

  function toggleComplete(dateStr: string) {
    const isCompleted = completedDays.has(dateStr);

    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (isCompleted) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });

    if (isCompleted) {
      supabase
        .from("completions")
        .delete()
        .eq("plan_id", planId)
        .eq("date", dateStr);
    } else {
      supabase
        .from("completions")
        .insert({ plan_id: planId, date: dateStr });
    }
  }

  const dayMap = useMemo(() => buildDayMap(generatedPlan), [generatedPlan]);

  const minYear = today.getFullYear();
  const minMonth = today.getMonth();
  const maxYear = raceDate.getFullYear();
  const maxMonth = raceDate.getMonth();

  function prevMonth() {
    setViewMonth((v) => {
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { year: v.year, month: v.month - 1 };
    });
  }

  function nextMonth() {
    setViewMonth((v) => {
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: v.month + 1 };
    });
  }

  const selectedDayData = selectedDay ? (dayMap.get(selectedDay) ?? null) : null;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PlanHeader summary={generatedPlan.plan_summary} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Calendar section */}
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <MonthNav
              year={viewMonth.year}
              month={viewMonth.month}
              minYear={minYear}
              minMonth={minMonth}
              maxYear={maxYear}
              maxMonth={maxMonth}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
            <CalendarGrid
              year={viewMonth.year}
              month={viewMonth.month}
              dayMap={dayMap}
              todayStr={todayStr}
              raceDateStr={generatedPlan.plan_summary.goal_date}
              planStartStr={planStartStr}
              selectedDay={selectedDay}
              completedDays={completedDays}
              onSelectDay={(d) => setSelectedDay(d === selectedDay ? null : d)}
              onToggleComplete={toggleComplete}
            />
            <WorkoutTypeLegend />
          </div>

          {/* Detail panel */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <WorkoutDetailPanel
              day={selectedDayData}
              isCompleted={selectedDay ? completedDays.has(selectedDay) : false}
              onToggleComplete={toggleComplete}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
