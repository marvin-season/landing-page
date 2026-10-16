"use client";

import { toast } from "@landing-page/design-system";
import { useEffect, useEffectEvent } from "react";
import { formatShanghaiDate } from "@/lib/bbq/business-day";

const lastShownDays = new Map<string, string>();
const weekMs = 7 * 24 * 60 * 60 * 1000;

function shownThisWeek(lastShownDay: string | null | undefined, today: string) {
  if (!lastShownDay) return false;
  const elapsed = Date.parse(today) - Date.parse(lastShownDay);
  return elapsed >= 0 && elapsed < weekMs;
}

export function useWeeklyReminder(
  storageKey: string,
  show: () => string | number,
  delay = 0,
) {
  const showReminder = useEffectEvent(show);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Effect Events read the latest callback without restarting the reminder timer.
  useEffect(() => {
    let id: string | number | undefined;
    // Delay until after Strict Mode replay; cancelled timers do not consume the week.
    const timer = window.setTimeout(() => {
      const today = formatShanghaiDate(new Date());
      // Keep the existing date keys so previous daily reminders start the cooldown.
      if (shownThisWeek(lastShownDays.get(storageKey), today)) return;
      try {
        if (shownThisWeek(window.localStorage.getItem(storageKey), today))
          return;
      } catch {
        // Keep the weekly limit in memory when browser storage is unavailable.
      }

      id = showReminder();
      lastShownDays.set(storageKey, today);
      try {
        window.localStorage.setItem(storageKey, today);
      } catch {
        // The in-memory date still prevents repeats during this page session.
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (id !== undefined) toast.dismiss(id);
    };
  }, [storageKey, delay]);
}
