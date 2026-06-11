import type { TrainingPaces } from "./types";

export function parsePace(pace: string): number {
  const [min, sec] = pace.split(":").map(Number);
  return min * 60 + sec;
}

export function formatPace(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function deriveTrainingPaces(currentPace: string): TrainingPaces {
  const base = parsePace(currentPace);
  return {
    easy: formatPace(base + 75),
    long: formatPace(base + 90),
    tempo: formatPace(Math.max(base - 20, 180)),
    intervals: formatPace(Math.max(base - 40, 150)),
  };
}
