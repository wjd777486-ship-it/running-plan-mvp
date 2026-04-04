"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { GeneratedPlan, TrainingDay, WorkoutType, Phase } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import PlanHeader from "./PlanHeader";
import MonthNav from "./MonthNav";
import CalendarGrid from "./CalendarGrid";
import WorkoutDetailPanel from "./WorkoutDetailPanel";
import WorkoutTypeLegend from "./WorkoutTypeLegend";

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatSelectedDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const SESSION_TYPE_MAP: Record<string, WorkoutType> = {
  easy: "easy",
  interval: "intervals",
  intervals: "intervals",
  tempo: "tempo",
  lsd: "long",
  long: "long",
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
      const workoutType = SESSION_TYPE_MAP[day.session_type?.toLowerCase() ?? ""] ?? "rest";
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
        warmup: day.warmup ?? null,
        cooldown: day.cooldown ?? null,
        tempoSegment: day.tempo_segment ?? null,
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
  const planStartStr = todayStr;

  const raceDate = new Date(generatedPlan.plan_summary.goal_date + "T00:00:00");
  const raceDateStr = generatedPlan.plan_summary.goal_date;

  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());

  // Calendar bottom sheet state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarAnimating, setCalendarAnimating] = useState(false);
  const [viewMonth, setViewMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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
      if (isCompleted) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });

    if (isCompleted) {
      supabase.from("completions").delete().eq("plan_id", planId).eq("date", dateStr);
    } else {
      supabase.from("completions").insert({ plan_id: planId, date: dateStr });
    }
  }

  const dayMap = useMemo(() => buildDayMap(generatedPlan), [generatedPlan]);

  const firstPlanDay = useMemo(() => {
    const keys = Array.from(dayMap.keys()).sort();
    return keys[0] ?? todayStr;
  }, [dayMap, todayStr]);

  const minYear = today.getFullYear();
  const minMonth = today.getMonth();
  const maxYear = raceDate.getFullYear();
  const maxMonth = raceDate.getMonth();

  function openCalendar() {
    // Sync viewMonth to selectedDay
    const d = new Date(selectedDay + "T00:00:00");
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    setCalendarOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCalendarAnimating(true));
    });
  }

  function closeCalendar() {
    setCalendarAnimating(false);
    setTimeout(() => setCalendarOpen(false), 300);
  }

  function handleCalendarSelectDay(dateStr: string) {
    setSelectedDay(dateStr);
    closeCalendar();
  }

  function prevDay() {
    const d = new Date(selectedDay + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const newDate = toDateStr(d);
    if (newDate >= firstPlanDay) setSelectedDay(newDate);
  }

  function nextDay() {
    const d = new Date(selectedDay + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const newDate = toDateStr(d);
    if (newDate <= raceDateStr) setSelectedDay(newDate);
  }

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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchCurrentY.current = e.touches[0].clientY;
    if (sheetRef.current && touchStartY.current !== null) {
      const delta = Math.max(0, touchCurrentY.current - touchStartY.current);
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.transform = `translateX(-50%) translateY(${delta}px)`;
    }
  }

  function handleTouchEnd() {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const delta = touchCurrentY.current - touchStartY.current;
      if (delta > 80) {
        if (sheetRef.current) { sheetRef.current.style.transition = ""; sheetRef.current.style.transform = ""; }
        closeCalendar();
      } else {
        if (sheetRef.current) {
          sheetRef.current.style.transition = "";
          sheetRef.current.style.transform = "translateX(-50%) translateY(0)";
        }
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  }

  const selectedDayData = dayMap.get(selectedDay) ?? null;
  const canGoPrev = selectedDay > firstPlanDay;
  const canGoNext = selectedDay < raceDateStr;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-[320px] pb-8">
        {/* Plan header: title + stats card */}
        <div style={{ paddingTop: 24 }}>
          <PlanHeader
            summary={generatedPlan.plan_summary}
            dayMap={dayMap}
            planStartStr={planStartStr}
            completedDays={completedDays}
          />
        </div>

        {/* Date navigation row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 30,
          }}
        >
          <button
            type="button"
            onClick={prevDay}
            disabled={!canGoPrev}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              border: "none",
              background: "none",
              padding: "8px 8px 0px",
              cursor: canGoPrev ? "pointer" : "default",
              opacity: canGoPrev ? 1 : 0.3,
            }}
          >
            <ChevronLeftIcon size={20} color="#0A0A0A" />
          </button>

          <button
            type="button"
            onClick={openCalendar}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "0 16px",
              height: 41.5,
              borderRadius: 10,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontFamily: "Pretendard, sans-serif",
              fontWeight: 600,
              fontSize: 17,
              lineHeight: "1.5em",
              letterSpacing: "-0.0254em",
              color: "#0A0A0A",
            }}
          >
            {formatSelectedDate(selectedDay)}
          </button>

          <button
            type="button"
            onClick={nextDay}
            disabled={!canGoNext}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              border: "none",
              background: "none",
              padding: "8px 8px 0px",
              cursor: canGoNext ? "pointer" : "default",
              opacity: canGoNext ? 1 : 0.3,
            }}
          >
            <ChevronRightIcon size={20} color="#0A0A0A" />
          </button>
        </div>

        {/* Workout detail for selected day */}
        <div style={{ marginTop: 10 }}>
          <WorkoutDetailPanel
            day={selectedDayData}
            isCompleted={completedDays.has(selectedDay)}
            onToggleComplete={toggleComplete}
            todayStr={todayStr}
            raceDateStr={raceDateStr}
            selectedDateStr={selectedDay}
          />
        </div>
      </div>

      {/* Calendar bottom sheet */}
      {calendarOpen && (
        <>
          {/* Dim overlay */}
          <div
            onClick={closeCalendar}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 40,
              opacity: calendarAnimating ? 1 : 0,
              transition: "opacity 300ms ease-out",
            }}
          />
          {/* Sheet */}
          <div
            ref={sheetRef}
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: calendarAnimating ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(100%)",
              transition: "transform 300ms ease-out",
              width: 360,
              backgroundColor: "#FFFFFF",
              borderRadius: "24px 24px 0px 0px",
              paddingTop: 20,
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 32,
              zIndex: 50,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
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
            <div style={{ marginTop: 12 }}>
              <CalendarGrid
                year={viewMonth.year}
                month={viewMonth.month}
                dayMap={dayMap}
                todayStr={todayStr}
                raceDateStr={raceDateStr}
                planStartStr={planStartStr}
                selectedDay={selectedDay}
                completedDays={completedDays}
                onSelectDay={handleCalendarSelectDay}
                onToggleComplete={toggleComplete}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <WorkoutTypeLegend />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
