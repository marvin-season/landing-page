const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

type ShanghaiParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function shanghaiParts(instant: Date): ShanghaiParts {
  const shifted = new Date(instant.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function businessDayKey(openedAt: Date): string {
  const parts = shanghaiParts(openedAt);
  const date = formatDate(parts.year, parts.month, parts.day);
  if (parts.hour < 3) return addDays(date, -1);
  if (parts.hour < 6) return `${date}#off`;
  return date;
}

export function isBusinessHours(now: Date): boolean {
  const { hour } = shanghaiParts(now);
  return hour >= 6 || hour < 3;
}

export function businessDayLabel(key: string): string {
  if (key.endsWith("#off")) return `${key.slice(0, -4)} 非营业时段`;
  return `${key} 营业日`;
}

export function currentBusinessDayKey(now: Date): string {
  return businessDayKey(now);
}

export function canCreateOrderForBusinessDay(
  now: Date,
  viewedBusinessDayKey: string,
): boolean {
  return (
    isBusinessHours(now) && viewedBusinessDayKey === currentBusinessDayKey(now)
  );
}

export function shiftBusinessDayKey(key: string, direction: -1 | 1): string {
  const off = key.endsWith("#off");
  const date = off ? key.slice(0, -4) : key;
  if (direction === 1) return off ? date : `${addDays(date, 1)}#off`;
  return off ? addDays(date, -1) : `${date}#off`;
}

export function formatShanghaiDate(instant: Date): string {
  const parts = shanghaiParts(instant);
  return formatDate(parts.year, parts.month, parts.day);
}

export function formatShanghaiHm(instant: Date): string {
  const parts = shanghaiParts(instant);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}(?:#off)?$/;

export function readBusinessDayParam(value: string | null, now: Date): string {
  if (value && DAY_KEY.test(value)) return value;
  return currentBusinessDayKey(now);
}
