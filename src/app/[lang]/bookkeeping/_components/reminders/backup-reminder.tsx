"use client";

import { Toaster, toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { DatabaseBackup } from "lucide-react";
import { useTheme } from "next-themes";
import { useWeeklyReminder } from "../../_hooks/use-weekly-reminder";
import { settingsPath } from "../../_lib/paths";
import { Companion } from "../companion/companion";
import { LocalLink as Link } from "../shared/local-link";

const reminderStorageKey = "bookkeeping-backup-reminder:last-shown-day";

export function BackupReminder() {
  const { t } = useLingui();
  const { resolvedTheme } = useTheme();
  const title = t`记得备份数据`;
  const description = t`数据仅保存在当前设备。移除应用前，请先备份数据，避免丢失。`;
  const actionLabel = t`去备份`;

  useWeeklyReminder(reminderStorageKey, () =>
    toast.info(title, {
      id: "bookkeeping-backup-reminder",
      description,
      action: (
        <Link
          href={settingsPath()}
          className="shrink-0 text-xs font-medium text-primary underline underline-offset-4"
        >
          {actionLabel}
        </Link>
      ),
      duration: 8_000,
      icon: (
        <Companion
          mood="hello"
          className="block size-14 object-contain"
          fallback={<DatabaseBackup className="size-5" />}
        />
      ),
      classNames: { icon: "size-5! shrink-0 has-[picture]:size-14!" },
    }),
  );

  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-right"
      dir="ltr"
      closeButton
      toastOptions={{ closeButtonAriaLabel: t`关闭` }}
    />
  );
}
