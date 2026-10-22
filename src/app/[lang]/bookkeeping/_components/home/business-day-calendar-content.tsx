"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  currentBusinessDayKey,
  formatShanghaiDate,
} from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import { bookkeepingPath } from "@/lib/bookkeeping-pwa/routes";
import { errorMessage } from "../../_lib/errors";
import { businessDayLabel } from "../../_lib/i18n";
import { LocalLink as Link } from "../shared/local-link";
import { CalendarControl, CalendarDate } from "./calendar-controls";

export function CalendarContent({ day }: { day: string }) {
  const { i18n, t } = useLingui();
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    i18n.date(new Date(Date.UTC(2024, 0, 1 + index)), {
      weekday: "narrow",
      timeZone: "UTC",
    }),
  );
  const [month, setMonth] = useState(day.slice(0, 7));
  const [offPeriod, setOffPeriod] = useState(day.endsWith("#off"));
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = formatShanghaiDate(new Date());

  useEffect(() => {
    let cancelled = false;
    void bbqStore.listAllOrders().then(
      (orders) => {
        if (cancelled) return;
        const next = new Map<string, number>();
        for (const order of orders) {
          next.set(
            order.businessDayKey,
            (next.get(order.businessDayKey) ?? 0) + 1,
          );
        }
        setCounts(next);
      },
      (reason: unknown) => {
        if (!cancelled) setError(errorMessage(i18n, reason));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [i18n]);

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  // Use saved business-day keys so historical off-period orders remain accessible.
  const months = [
    ...new Set([
      month,
      day.slice(0, 7),
      today.slice(0, 7),
      ...Array.from(counts?.keys() ?? [], (key) => key.slice(0, 7)),
    ]),
  ]
    .sort()
    .reverse();

  function shiftMonth(direction: -1 | 1) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
    setMonth(
      `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <CalendarControl
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={t`上个月`}
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </CalendarControl>
        <select
          aria-label={t`选择月份`}
          className="rounded-lg border border-transparent bg-muted/40 px-2 font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-inset focus-visible:bg-muted/70 cursor-pointer text-foreground min-h-11 text-base"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          {months.map((value) => (
            <option key={value} value={value}>
              {i18n.date(new Date(`${value}-01T00:00:00Z`), {
                year: "numeric",
                month: "long",
                timeZone: "UTC",
              })}
            </option>
          ))}
        </select>
        <CalendarControl
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={t`下个月`}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </CalendarControl>
      </div>
      <div
        className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1"
        role="group"
        aria-label={t`选择时段类型`}
      >
        {[false, true].map((off) => (
          <CalendarControl
            key={String(off)}
            type="button"
            size="sm"
            variant="ghost"
            className={` ${offPeriod === off ? "bg-card text-foreground hover:bg-card focus-visible:bg-card" : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"}`}
            aria-pressed={offPeriod === off}
            onClick={() => setOffPeriod(off)}
          >
            {off ? t`休息时段` : t`记账时段`}
          </CalendarControl>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdays.map((weekday, index) => (
          <span key={index} className="py-1 text-xs text-muted-foreground">
            {weekday}
          </span>
        ))}
        {Array.from({ length: cellCount }, (_, index) => {
          const date = index - firstWeekday + 1;
          if (date < 1 || date > daysInMonth) return <span key={index} />;
          const dateKey = `${month}-${String(date).padStart(2, "0")}`;
          const key = `${dateKey}${offPeriod ? "#off" : ""}`;
          const count = counts?.get(key) ?? 0;
          const selected = key === day;
          return (
            <Dialog.Close key={dateKey} asChild>
              <CalendarDate
                state={selected ? "selected" : count > 0 ? "recorded" : "empty"}
                today={dateKey === today}
              >
                <Link
                  href={bookkeepingPath("", { day: key })}
                  prefetch={false}
                  aria-label={`${businessDayLabel(i18n, key)}${counts ? t`，${count} 条记录` : ""}${selected ? t`，已选中` : ""}`}
                  aria-current={dateKey === today ? "date" : undefined}
                >
                  <span className="font-medium">{date}</span>
                  <span className="h-3 text-[10px] leading-3">
                    {count > 0 ? t`${count} 条` : ""}
                  </span>
                </Link>
              </CalendarDate>
            </Dialog.Close>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground" role="status">
          {error ??
            (counts ? t`有记录的日期显示记录数` : t`读取记账时段记录中…`)}
        </p>
        <Dialog.Close asChild>
          <CalendarControl
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0 bg-muted/40"
          >
            <Link
              href={bookkeepingPath("", {
                day: currentBusinessDayKey(new Date()),
              })}
            >
              <Trans>回到当前时段</Trans>
            </Link>
          </CalendarControl>
        </Dialog.Close>
      </div>
    </div>
  );
}
