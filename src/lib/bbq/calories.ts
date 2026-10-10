import { BbqStoreError } from "./store";

export type CalorieSummary = {
  totalKcal: number;
  recordedLineCount: number;
  missingLineCount: number;
};

export function assertCaloriesKcal(
  value: number | null | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new BbqStoreError("invalid_calories");
  }
  return value;
}

export function summarizeCalories(
  lines: ReadonlyArray<{ caloriesKcal?: number | null; quantity: number }>,
): CalorieSummary {
  const summary = { totalKcal: 0, recordedLineCount: 0, missingLineCount: 0 };
  for (const line of lines) {
    if (line.caloriesKcal == null) {
      summary.missingLineCount += 1;
    } else {
      summary.totalKcal += line.caloriesKcal * line.quantity;
      summary.recordedLineCount += 1;
    }
  }
  return summary;
}

export function formatCalories(summary: CalorieSummary): string {
  if (summary.recordedLineCount === 0) return "未记录";
  const value = Number(summary.totalKcal.toFixed(2));
  return `${value} kcal${summary.missingLineCount > 0 ? "（部分）" : ""}`;
}
