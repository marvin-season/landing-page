"use client";

import { Toaster, toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { formatShanghaiDate } from "@/lib/bbq/business-day";
import { getLocaleDir } from "@/lib/i18n/locales";

const noticeStorageKey = "bookkeeping-local-data-notice:last-shown-day";
let lastShownDay: string | null = null;

export function LocalDataNotice() {
  const { i18n, t } = useLingui();
  const { resolvedTheme } = useTheme();
  const title = t`数据存储与备份`;
  const description = t`记账数据仅保存在当前设备的浏览器中，不会自动上传或同步到云端。请定期导出备份，避免清除浏览器数据或更换设备后丢失记录。`;

  useEffect(() => {
    let id: string | number | undefined;
    // 延后展示，避免 Strict Mode 重放 effect 时提前消耗当天提醒。
    const timer = window.setTimeout(() => {
      const today = formatShanghaiDate(new Date());
      if (lastShownDay === today) return;
      try {
        if (window.localStorage.getItem(noticeStorageKey) === today) return;
      } catch {
        // 浏览器禁用存储时，仍在当前页面会话内限制为每天一次。
      }

      id = toast.info(title, {
        id: "bookkeeping-local-data-notice",
        description,
        duration: 8_000,
      });
      lastShownDay = today;
      try {
        window.localStorage.setItem(noticeStorageKey, today);
      } catch {
        // 内存中的日期继续防止重复提醒，不影响设置页使用。
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (id !== undefined) toast.dismiss(id);
    };
  }, [title, description]);

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
