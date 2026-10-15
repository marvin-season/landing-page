"use client";

import { Toaster, toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { formatShanghaiDate } from "@/lib/bbq/business-day";
import { getLocaleDir } from "@/lib/i18n/locales";
import { BbqCompanion } from "./bbq-companion";
import { BbqLink as Link } from "./bbq-link";
import { bbqSettingsPath } from "./bbq-paths";

const reminderStorageKey = "bookkeeping-backup-reminder:last-shown-day";
let lastShownDay: string | null = null;

export function BackupReminder() {
  const { i18n, t } = useLingui();
  const { resolvedTheme } = useTheme();
  const title = t`记得备份数据`;
  const description = t`数据仅保存在当前设备。移除应用前，请先备份数据，避免丢失。`;
  const actionLabel = t`去备份`;

  useEffect(() => {
    let id: string | number | undefined;
    // 延后触发，避免 Strict Mode 的 effect 重放先记下日期又立即关闭提示。
    const timer = window.setTimeout(() => {
      const today = formatShanghaiDate(new Date());
      if (lastShownDay === today) return;
      try {
        if (window.localStorage.getItem(reminderStorageKey) === today) return;
      } catch {
        // 存储不可用时，当前页面会话内仍保持每天一次。
      }

      id = toast.info(title, {
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
      });
      lastShownDay = today;
      try {
        window.localStorage.setItem(reminderStorageKey, today);
      } catch {
        // 日期已保存在内存中，不阻断提醒。
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (id !== undefined) toast.dismiss(id);
    };
  }, [title, description, actionLabel]);

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
