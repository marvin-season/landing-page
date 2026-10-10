"use client";

import { Button } from "@landing-page/design-system";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/components/link/link";
import { accountingDay, accountingDayLabel } from "@/lib/bbq/accounting";
import { formatShanghaiDate } from "@/lib/bbq/business-day";
import { getAccountingStore } from "@/lib/bbq/idb-store";
import type { AccountingMode } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { cls } from "./bbq-layout";
import { bbqHomePath } from "./bbq-paths";

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const calendarControlCls = cls`
  rounded-lg shadow-none transition-colors duration-150
  hover:bg-muted/70 hover:shadow-none focus-visible:ring-1
  focus-visible:ring-inset focus-visible:ring-primary/50
  focus-visible:ring-offset-0 focus-visible:bg-muted/70
  shinchan:rounded-lg
`;
const dateCls = cls`
  flex min-h-12 flex-col items-center justify-center rounded-lg text-sm
  tabular-nums transition-colors focus-visible:outline-none
  focus-visible:ring-1
  border duration-150 focus-visible:ring-inset
`;

export function BusinessDayCalendar({
  day,
  mode = "shop",
}: {
  day: string;
  mode?: AccountingMode;
}) {
  const personal = mode === "personal";
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={!day}
          className="min-w-36 px-2 text-center text-xs font-medium tabular-nums text-foreground min-h-8 rounded-full transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 duration-150 focus-visible:ring-inset focus-visible:bg-muted/70 data-[state=open]:bg-muted/70 cursor-pointer disabled:pointer-events-none"
          aria-label={`${day ? accountingDayLabel(mode, day) : personal ? "日期" : "营业日"}，打开日历`}
        >
          {day ? accountingDayLabel(mode, day) : personal ? "日期" : "营业日"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border bg-card p-4 text-foreground shadow-lg focus:outline-none">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              {personal ? "记账日历" : "营业日日历"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`${calendarControlCls} size-8`}
                aria-label="关闭日历"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            {personal
              ? "选择日期查看消费订单，按自然日统计"
              : "选择日期查看订单 · 营业时间 06:00 至次日 03:00"}
          </Dialog.Description>
          {open ? <CalendarContent day={day} mode={mode} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CalendarContent({ day, mode }: { day: string; mode: AccountingMode }) {
  const personal = mode === "personal";
  const store = getAccountingStore(mode);
  const [month, setMonth] = useState(day.slice(0, 7));
  const [offPeriod, setOffPeriod] = useState(day.endsWith("#off"));
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = formatShanghaiDate(new Date());

  useEffect(() => {
    let cancelled = false;
    void store.listAllOrders().then(
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
        if (!cancelled) setError(bbqErrorMessage(reason));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store]);

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
          className={`${calendarControlCls} size-8`}
          aria-label="上个月"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <select
          aria-label="选择月份"
          className="min-h-9 rounded-lg border border-transparent bg-muted/40 px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-inset focus-visible:bg-muted/70 cursor-pointer"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          {months.map((value) => (
            <option key={value} value={value}>
              {value.replace("-", " 年 ")} 月
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${calendarControlCls} size-8`}
          aria-label="下个月"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {personal ? null : (
        <div
          className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1"
          role="group"
          aria-label="选择档期类型"
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
              {off ? "非营业时段" : "营业日"}
            </Button>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdays.map((weekday) => (
          <span key={weekday} className="py-1 text-xs text-muted-foreground">
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
                href={bbqHomePath(key, mode)}
                prefetch={false}
                aria-label={`${accountingDayLabel(mode, key)}${counts ? `，${count} 张订单` : ""}${selected ? "，已选中" : ""}`}
                aria-current={dateKey === today ? "date" : undefined}
                className={`${dateCls} ${selected ? "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:bg-primary/90 focus-visible:ring-primary-foreground/70" : count > 0 ? "bg-primary/5 text-foreground hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-primary/50" : "text-muted-foreground hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-primary/50"} ${dateKey === today && !selected ? "border-primary/30" : "border-transparent"}`}
              >
                <span className="font-medium">{date}</span>
                <span className="h-3 text-[10px] leading-3">
                  {count > 0 ? `${count} 单` : ""}
                </span>
              </Link>
            </Dialog.Close>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground" role="status">
          {error ??
            (counts
              ? "有订单的日期显示单数"
              : personal
                ? "读取每日订单中…"
                : "读取营业日订单中…")}
        </p>
        <Dialog.Close asChild>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={`${calendarControlCls} shrink-0 bg-muted/40`}
          >
            <Link href={bbqHomePath(accountingDay(mode, new Date()), mode)}>
              {personal ? "回到今天" : "回到当前档"}
            </Link>
          </Button>
        </Dialog.Close>
      </div>
    </div>
  );
}
