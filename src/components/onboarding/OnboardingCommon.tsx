import { cn } from "../../lib/utils";
import type { RaceType, RunnerFormData } from "../../lib/types";

export const INITIAL_FORM: RunnerFormData = {
  raceType: "full",
  raceDate: "",
  goalHours: 0,
  goalMinutes: 0,
  pbHours: 0,
  pbMinutes: 0,
  pbSeconds: 0,
  noPb: false,
  gender: "male",
  age: 0,
  expYears: 0,
  expMonths: 0,
  weeklyMileage1: 0,
  weeklyMileage4: 0,
  maxRunDistance: 0,
  trainingDays: [],
  joggingDist: 0,
  joggingPaceMin: 6,
  joggingPaceSec: 0,
  joggingHr: 0,
  joggingCadence: null,
  runningDist: 0,
  runningPaceMin: 5,
  runningPaceSec: 0,
  runningHr: 0,
  runningCadence: null,
};

export const RACE_OPTIONS: { value: RaceType; label: string }[] = [
  { value: "5k", label: "5km" },
  { value: "10k", label: "10km" },
  { value: "half", label: "하프" },
  { value: "full", label: "풀" },
];

export const DAYS_OF_WEEK = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
];

export function formatTimeDisplay(timeStr: string): string {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    const [h, m] = parts;
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  }
  return `${parts[0]}분`;
}

export function CheckmarkCircle({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 20, height: 20, borderRadius: 9999, backgroundColor: "#0088FF" }}
      >
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div
      className="shrink-0"
      style={{ width: 20, height: 20, borderRadius: 9999, border: "2px solid #D1D5DC" }}
    />
  );
}

export function PlanDataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <span style={{ fontWeight: 500, fontSize: 15, lineHeight: "1.5em", letterSpacing: "-0.0156em", color: "#4A5565" }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.5em", letterSpacing: "-0.0156em", color: valueColor ?? "#0A0A0A", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export function AnalysisSection({ emoji, label, labelColor, items }: { emoji: string; label: string; labelColor: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 400, fontSize: 16, lineHeight: "1.5em", color: "#0A0A0A" }}>{emoji}</span>
        <span style={{ fontWeight: 600, fontSize: 15, lineHeight: "1.5em", color: labelColor }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <span style={{ fontWeight: 400, fontSize: 14, lineHeight: "1.5em", color: "#364153", flexShrink: 0, paddingLeft: 4 }}>•</span>
            <span style={{ fontWeight: 400, fontSize: 14, lineHeight: "1.5em", color: "#364153", letterSpacing: "-0.0107em" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex w-full">
      {([1, 2, 3] as const).map((s) => (
        <div
          key={s}
          className={cn(
            "h-[3px] flex-1 transition-colors duration-300",
            s <= step ? "bg-[#0088FF]" : "bg-[#E5E5EA]"
          )}
        />
      ))}
    </div>
  );
}

export function FieldLabel({
  label,
  required,
  sub,
}: {
  label: string;
  required?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-end gap-[2px] pb-1">
      <span
        className="font-medium text-black"
        style={{ fontSize: 15, lineHeight: "1.45" }}
      >
        {label}
      </span>
      {sub && (
        <span
          className="text-[#727272] ml-[2px]"
          style={{ fontSize: 15, lineHeight: "1.45", fontWeight: 500 }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

export function NumBox({
  value,
  onChange,
  min,
  max,
  wide,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-[rgba(60,60,67,0.29)] rounded-lg flex items-center justify-center transition-opacity",
        wide ? "w-20 h-[52px]" : "w-[60px] h-[52px]",
        disabled && "opacity-40"
      )}
    >
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        className="w-full h-full text-center font-medium outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed [&:focus::placeholder]:text-transparent"
        style={{ fontSize: 16, lineHeight: "1.45" }}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </div>
  );
}

export function Chip({
  label,
  selected,
  onClick,
  flex,
  size = "s",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  flex?: boolean;
  size?: "s" | "m";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border font-semibold transition-colors text-center",
        size === "m"
          ? "px-[14px] py-2 text-base"
          : "px-3 py-1.5 text-[14px]",
        flex && "flex-1",
        selected
          ? "border-[#0088FF] text-[#0088FF]"
          : "border-[rgba(60,60,67,0.6)] text-black"
      )}
    >
      {label}
    </button>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <p
        className="font-semibold text-black"
        style={{ fontSize: 17, lineHeight: "1.45" }}
      >
        {title}
      </p>
      {sub && (
        <p
          className="font-medium text-[#5E6368] mt-1"
          style={{ fontSize: 14, lineHeight: "1.40" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
