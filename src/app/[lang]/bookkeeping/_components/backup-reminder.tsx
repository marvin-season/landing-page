"use client";

import { Toaster, toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { getLocaleDir } from "@/lib/i18n/locales";

export function BackupReminder() {
  const { i18n, t } = useLingui();
  const { resolvedTheme } = useTheme();
  const title = t`记得备份数据`;
  const description = t`数据仅保存在当前设备。移除应用前，请先备份数据，避免丢失。`;

  useEffect(() => {
    const id = toast.info(title, {
      id: "bookkeeping-backup-reminder",
      description,
      duration: 10_000,
      icon: (
        <Image
          unoptimized
          src="/bbq/companions/hello.gif"
          alt=""
          width={56}
          height={56}
          className="size-14 object-contain"
        />
      ),
      classNames: { icon: "size-14! shrink-0" },
    });

    return () => {
      toast.dismiss(id);
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
