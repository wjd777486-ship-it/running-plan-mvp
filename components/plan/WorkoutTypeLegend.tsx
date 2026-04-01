import type { WorkoutType } from "@/lib/types";

const LEGEND: { type: WorkoutType; label: string; color: string }[] = [
  { type: "easy",      label: "쉬운 달리기", color: "bg-emerald-400" },
  { type: "tempo",     label: "템포런",      color: "bg-orange-400"  },
  { type: "intervals", label: "인터벌",      color: "bg-rose-500"    },
  { type: "long",      label: "롱런",        color: "bg-violet-500"  },
  { type: "rest",      label: "휴식",        color: "bg-muted-foreground/40" },
  { type: "race",      label: "대회",        color: "bg-yellow-400"  },
];

export default function WorkoutTypeLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
      {LEGEND.map(({ type, label, color }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span className={`inline-block size-2.5 rounded-full ${color}`} />
          {label}
        </div>
      ))}
    </div>
  );
}
