"use client";

import { Toaster, toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { useTheme } from "next-themes";
import { getLocaleDir } from "@/lib/i18n/locales";
import { BbqCompanion } from "./bbq-companion";
import { BbqLink as Link } from "./bbq-link";
import { bbqSettingsPath } from "./bbq-paths";
import { useDailyReminder } from "./use-daily-reminder";

const reminderStorageKey = "bookkeeping-backup-reminder:last-shown-day";

export function BackupReminder() {
  const { i18n, t } = useLingui();
  const { resolvedTheme } = useTheme();
  const title = t`记得备份数据`;
  const description = t`数据仅保存在当前设备。移除应用前，请先备份数据，避免丢失。`;
  const actionLabel = t`去备份`;

  useDailyReminder(reminderStorageKey, () =>
    toast.info(title, {
      id: "bookkeeping-backup-reminder",
      description,
      action: (
        <Link
          href={bbqSettingsPath()}
          className="shrink-0 text-xs font-medium text-primary underline underline-offset-4"
        >
          {actionLabel}
        </Link>
      ),
      duration: 8_000,
      icon: (
        <BbqCompanion mood="hello" className="block size-14 object-contain" />
      ),
      classNames: { icon: "size-14! shrink-0" },
    }),
  );

  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-right"
      dir={getLocaleDir(i18n.locale)}
      closeButton
      toastOptions={{ closeButtonAriaLabel: t`关闭` }}
    />
  );
}
