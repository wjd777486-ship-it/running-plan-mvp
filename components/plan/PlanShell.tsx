"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { GeneratedPlan, TrainingDay, WorkoutType, Phase } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, BookmarkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import PlanHeader from "./PlanHeader";
import MonthNav from "./MonthNav";
import CalendarGrid from "./CalendarGrid";
import WorkoutDetailPanel from "./WorkoutDetailPanel";
import WorkoutTypeLegend from "./WorkoutTypeLegend";
import { getOrCreateAnonymousUserId } from "@/lib/anonymous-user";

function InviteCodeSection() {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const showSnackbar = useCallback(() => {
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 2500);
  }, []);

  async function handleGetCode() {
    if (myCode) {
      navigator.clipboard.writeText(myCode).catch(() => {});
      showSnackbar();
      return;
    }
    setLoading(true);
    try {
      const sessionId = getOrCreateAnonymousUserId();
      const res = await fetch("/api/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.code) {
        setMyCode(data.code);
        navigator.clipboard.writeText(data.code).catch(() => {});
        showSnackbar();
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  type KakaoType = { Share: { sendDefault: (opts: unknown) => void }; isInitialized: () => boolean; init: (key: string) => void };

  function getKakao(): KakaoType | null {
    return (window as unknown as { Kakao?: KakaoType }).Kakao ?? null;
  }

  function loadKakaoSDK(): Promise<KakaoType> {
    return new Promise((resolve, reject) => {
      const existing = getKakao();
      if (existing) { resolve(existing); return; }
      const script = document.createElement("script");
      script.src = "https://developers.kakao.com/sdk/js/kakao.js";
      script.onload = () => {
        const kakao = getKakao();
        if (kakao) resolve(kakao);
        else reject(new Error("Kakao object not found after script load"));
      };
      script.onerror = () => reject(new Error("Failed to load Kakao SDK script"));
      document.head.appendChild(script);
    });
  }

  async function handleKakaoShare() {
    try {
      const kakao = await loadKakaoSDK();
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) { console.error("[KakaoShare] NEXT_PUBLIC_KAKAO_JS_KEY not set"); return; }
      if (!kakao.isInitialized()) kakao.init(key);
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "뛰뛰빵빵 — AI 러닝 훈련 플랜",
          description: "AI 러닝 코치가 대회 목표에 맞춰 훈련 계획을 짜줘요.",
          imageUrl: "https://running-plan-mvp.vercel.app/og-image.png",
          link: {
            mobileWebUrl: "https://running-plan-mvp.vercel.app/invite",
            webUrl: "https://running-plan-mvp.vercel.app/invite",
          },
        },
        buttons: [
          {
            title: "훈련 플랜 받기",
            link: {
              mobileWebUrl: "https://running-plan-mvp.vercel.app/invite",
              webUrl: "https://running-plan-mvp.vercel.app/invite",
            },
          },
        ],
      });
    } catch (e) {
      console.error("[KakaoShare] failed:", e);
    }
  }

  return (
    <div
      style={{
        marginTop: 24,
        width: 320,
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxSizing: "border-box",
      }}
    >
      {/* 타이틀 + 설명 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: 17,
            lineHeight: "1.45em",
            letterSpacing: "-0.0254em",
            color: "#0A0A0A",
          }}
        >
          내 주변 러너에게도 알려주세요
        </span>
        <p
          style={{
            margin: 0,
            fontWeight: 400,
            fontSize: 14,
            lineHeight: "1.5em",
            letterSpacing: "-0.01em",
            color: "#364153",
            whiteSpace: "pre-line",
          }}
        >
          {"1. [초대코드 받기] 버튼 클릭\n2. [카카오톡 공유] 버튼 클릭\n3. 복사한 초대코드 붙여넣기\n* 초대코드 1개당 3회 이용할 수 있어요."}
        </p>
      </div>

      {/* 버튼 2개 나란히 */}
      <div style={{ display: "flex", gap: 10, width: 280 }}>
        <button
          type="button"
          onClick={handleGetCode}
          disabled={loading}
          style={{
            width: 135,
            padding: myCode ? "15px 20px" : "15px 0",
            borderRadius: 14,
            border: "1px solid #0088FF",
            backgroundColor: "#FFFFFF",
            color: "#0088FF",
            fontWeight: 600,
            fontSize: myCode ? 18 : 14,
            lineHeight: "1.4em",
            letterSpacing: myCode ? "-0.024em" : "normal",
            fontFamily: "Pretendard, sans-serif",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxSizing: "border-box",
          }}
        >
          {loading ? "생성 중..." : myCode ? (
            <>
              <span>{myCode}</span>
              <CopyIcon size={20} color="#0088FF" strokeWidth={1.5} />
            </>
          ) : "초대코드 받기"}
        </button>

        <button
          type="button"
          onClick={handleKakaoShare}
          style={{
            width: 135,
            padding: "15px 0",
            borderRadius: 14,
            border: "1px solid #0088FF",
            backgroundColor: "#FFFFFF",
            color: "#0088FF",
            fontWeight: 600,
            fontSize: 14,
            lineHeight: "1.4em",
            fontFamily: "Pretendard, sans-serif",
            cursor: "pointer",
          }}
        >
          카카오톡 공유
        </button>
      </div>

      {snackbar && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#222324",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "14px 24px",
            width: 320,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0px 4px 10px 0px rgba(11, 12, 12, 0.16)",
            zIndex: 100,
            boxSizing: "border-box",
          }}
        >
          초대코드를 복사했어요.
        </div>
      )}
    </div>
  );
}

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
  const router = useRouter();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const raceDate = new Date(generatedPlan.plan_summary.goal_date + "T00:00:00");
  const raceDateStr = generatedPlan.plan_summary.goal_date;

  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [urlSnackbar, setUrlSnackbar] = useState(false);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setUrlSnackbar(true);
    setTimeout(() => setUrlSnackbar(false), 2500);
  }, []);

  function handleRetrain() {
    localStorage.removeItem("plan_id");
    router.push("/onboarding");
  }

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
      .then(({ data, error }) => {
        console.log("[completions] select:", data, error);
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
      (async () => {
        const { error } = await supabase.from("completions").delete().eq("plan_id", planId).eq("date", dateStr);
        if (error) console.error("[completions] delete error:", error);
      })();
    } else {
      (async () => {
        const { error } = await supabase.from("completions").insert({ plan_id: planId, date: dateStr });
        if (error) console.error("[completions] insert error:", error.code, error.message, error.details, error.hint);
      })();
    }
  }

  const dayMap = useMemo(() => buildDayMap(generatedPlan), [generatedPlan]);

  const firstPlanDay = useMemo(() => {
    const keys = Array.from(dayMap.keys()).sort();
    return keys[0] ?? todayStr;
  }, [dayMap, todayStr]);

  const planStartStr = firstPlanDay;

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
      {/* Nav header */}
      <header
        style={{
          width: 320,
          margin: "0 auto",
          height: 59,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 500, fontSize: 18, lineHeight: "1.4em", color: "#0A0A0A" }}>
          뛰뛰빵빵
        </span>
        <button
          type="button"
          onClick={handleCopyUrl}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            fontFamily: "Pretendard, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            lineHeight: "145%",
            color: "#000000",
          }}
        >
          훈련 저장
        </button>
      </header>

      <div className="mx-auto w-[320px] pb-8">
        {/* Plan header: title + stats card */}
        <div style={{ paddingTop: 8 }}>
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

        {/* 초대코드 공유 + 훈련 다시 짜기 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <InviteCodeSection />

          <div
            style={{
              display: "flex",
              width: "100%",
              padding: "10px 0",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={handleRetrain}
              style={{
                background: "none",
                border: "none",
                fontFamily: "Pretendard, sans-serif",
                fontWeight: 500,
                fontSize: 16,
                lineHeight: "145%",
                letterSpacing: "-0.109px",
                color: "#364153",
                cursor: "pointer",
                textAlign: "center",
                textDecorationLine: "underline",
                textDecorationStyle: "solid",
                textDecorationSkipInk: "auto",
                textUnderlineOffset: "auto",
              }}
            >
              훈련 다시 짜기
            </button>
          </div>
        </div>
      </div>

      {/* URL 복사 토스트 */}
      {urlSnackbar && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#222324",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "14px 24px",
            width: 320,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0px 4px 10px 0px rgba(11, 12, 12, 0.16)",
            zIndex: 100,
            boxSizing: "border-box",
          }}
        >
          훈련 플랜 링크를 복사했어요.
        </div>
      )}

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
