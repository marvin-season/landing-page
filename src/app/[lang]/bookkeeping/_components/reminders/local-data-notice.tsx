"use client";

import { Toaster, toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { useTheme } from "next-themes";
import { getLocaleDir } from "@/lib/i18n/locales";
import { useWeeklyReminder } from "../../_hooks/use-weekly-reminder";

const noticeStorageKey = "bookkeeping-local-data-notice:last-shown-day";

export function LocalDataNotice() {
  const { i18n, t } = useLingui();
  const { resolvedTheme } = useTheme();
  const title = t`数据存储与备份`;
  const description = t`记账数据仅保存在当前设备的浏览器中，不会自动上传或同步到云端。请定期导出备份，避免清除浏览器数据或更换设备后丢失记录。`;

  useWeeklyReminder(noticeStorageKey, () =>
    toast.info(title, {
      id: "bookkeeping-local-data-notice",
      description,
      duration: 8_000,
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
