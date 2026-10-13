"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { Link } from "@/components/link/link";
import {
  currentBusinessDayKey,
  formatShanghaiDate,
} from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import { bbqErrorMessage } from "./bbq-errors";
import { businessDayLabel } from "./bbq-i18n";
import { cls } from "./bbq-layout";
import { bbqHomePath } from "./bbq-paths";

const calendarControlCls = cls`
  rounded-lg shadow-none transition-colors duration-150 hover:bg-muted/70
  hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:bg-muted/70
  shinchan:rounded-lg min-h-11
`;
const dateCls = cls`
  flex min-h-12 flex-col items-center justify-center rounded-lg text-sm
  tabular-nums transition-colors focus-visible:outline-none
  focus-visible:ring-1
  border duration-150 focus-visible:ring-inset
`;

export function BusinessDayCalendar({
  day,
  children,
}: {
  day: string;
  children: ReactElement;
}) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-110 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-110 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-auto overscroll-contain rounded-xl border bg-card p-4 text-foreground shadow-lg focus:outline-none">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              <Trans>记账时段日历</Trans>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`${calendarControlCls} size-11`}
                aria-label={t`关闭日历`}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            <Trans>选择日期查看记录 · 记账时段 06:00 至次日 03:00</Trans>
          </Dialog.Description>
          {open ? <CalendarContent day={day} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CalendarContent({ day }: { day: string }) {
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
        if (!cancelled) setError(bbqErrorMessage(i18n, reason));
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${calendarControlCls} size-11`}
          aria-label={t`上个月`}
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${calendarControlCls} size-11`}
          aria-label={t`下个月`}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div
        className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1"
        role="group"
        aria-label={t`选择时段类型`}
      >
        {[false, true].map((off) => (
          <Button
            key={String(off)}
            type="button"
            size="sm"
            variant="ghost"
            className={`${calendarControlCls} ${offPeriod === off ? "bg-card text-foreground hover:bg-card focus-visible:bg-card" : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"}`}
            aria-pressed={offPeriod === off}
            onClick={() => setOffPeriod(off)}
          >
            {off ? t`休息时段` : t`记账时段`}
          </Button>
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
              <Link
                href={bbqHomePath(key)}
                prefetch={false}
                aria-label={`${businessDayLabel(i18n, key)}${counts ? t`，${count} 条记录` : ""}${selected ? t`，已选中` : ""}`}
                aria-current={dateKey === today ? "date" : undefined}
                className={`${dateCls} ${selected ? "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:bg-primary/90 focus-visible:ring-primary-foreground/70" : count > 0 ? "bg-primary/5 text-foreground hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-primary/50" : "text-muted-foreground hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-primary/50"} ${dateKey === today && !selected ? "border-primary/30" : "border-transparent"}`}
              >
                <span className="font-medium">{date}</span>
                <span className="h-3 text-[10px] leading-3">
                  {count > 0 ? t`${count} 条` : ""}
                </span>
              </Link>
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
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={`${calendarControlCls} shrink-0 bg-muted/40`}
          >
            <Link href={bbqHomePath(currentBusinessDayKey(new Date()))}>
              <Trans>回到当前时段</Trans>
            </Link>
          </Button>
        </Dialog.Close>
      </div>
    </div>
  );
}
