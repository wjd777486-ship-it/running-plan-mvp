"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

interface MonthNavProps {
  year: number;
  month: number; // 0-indexed
  minYear: number;
  minMonth: number;
  maxYear: number;
  maxMonth: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function MonthNav({ year, month, minYear, minMonth, maxYear, maxMonth, onPrev, onNext }: MonthNavProps) {
  const isMin = year === minYear && month === minMonth;
  const isMax = year === maxYear && month === maxMonth;

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" size="icon" onClick={onPrev} disabled={isMin} aria-label="이전 달">
        <ChevronLeftIcon className="size-4" />
      </Button>
      <p className="text-base font-semibold tabular-nums">
        {year}년 {MONTHS_KO[month]}
      </p>
      <Button variant="outline" size="icon" onClick={onNext} disabled={isMax} aria-label="다음 달">
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
