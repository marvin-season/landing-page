"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactElement, useState } from "react";
import { CalendarControl } from "./calendar-controls";

const CalendarContent = dynamic(
  () =>
    import("./business-day-calendar-content").then(
      (module) => module.CalendarContent,
    ),
  {
    loading: () => (
      <p role="status">
        <Trans>读取全部时段数据中…</Trans>
      </p>
    ),
  },
);

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
              <CalendarControl
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t`关闭日历`}
              >
                <X className="size-4" aria-hidden="true" />
              </CalendarControl>
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
