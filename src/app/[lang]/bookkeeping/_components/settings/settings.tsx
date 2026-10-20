"use client";

import { Alert, AlertDescription } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { Languages, Palette, Smartphone } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemePicker } from "@/components/theme/theme-picker";
import { useSettingsData } from "../../_hooks/use-settings-data";
import { cls, pageShellCls, pageTitleCls } from "../../_styles/layout";
import { settingsCardCls } from "../../_styles/settings-styles";
import { Companion } from "../companion/companion";
import { CompanionAlbumSettings } from "../companion/companion-album-settings";
import { InstallButton } from "../pwa/install-button";
import { OfflineStatus } from "../pwa/offline-status";
import { LocalDataNotice } from "../reminders/local-data-notice";
import { BackupSettings } from "./backup-settings";
import { CleanupSettings } from "./cleanup-settings";
import { GroupingSettingsCard } from "./grouping-settings";
import { SupportCard } from "./support-card";

const groupLabelCls = cls`shrink-0 px-1 pt-3 text-xs font-medium text-muted-foreground first:pt-0`;
const preferenceControlCls = cls`
  shrink-0 [&>button]:min-h-8 [&>button]:min-w-16 [&>button]:rounded-md
  [&>button]:border [&>button]:border-border/60 [&>button]:bg-muted/30
  [&>button]:px-2 [&>button]:text-foreground [&>button:hover]:bg-muted/70 [&>button]:text-sm
  [&>button:focus-visible]:ring-1 [&>button:focus-visible]:ring-primary/50
`;
const settingsHighlightCls = cls`
  [&_[data-settings-section]]:scroll-mt-2
  [&_[data-settings-section]]:transition-[border-color]
  [&_[data-settings-section]]:duration-500
  [&_[data-settings-section]>summary]:transition-colors
  [&_[data-settings-section]>summary]:duration-500
  [&_[data-settings-section][data-highlighted]]:border-primary/40
  [&_[data-settings-section][data-highlighted]>summary]:bg-primary/5
`;

export function Settings() {
  const { i18n } = useLingui();
  const section = useSearchParams().get("section");
  const settingsRef = useRef<HTMLDivElement>(null);
  const data = useSettingsData();
  const { task, message, notice } = data;

  useEffect(() => {
    if (section !== "backup" && section !== "companion-album") return;
    const target = settingsRef.current?.querySelector<HTMLElement>(
      `[data-settings-section="${section}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    // 首屏绘制后再突出目标区域，留出足够时间辨认后平滑恢复。
    const highlightTimer = window.setTimeout(() => {
      target.dataset.highlighted = "true";
    }, 100);
    const restoreTimer = window.setTimeout(() => {
      delete target.dataset.highlighted;
    }, 3600);
    return () => {
      window.clearTimeout(highlightTimer);
      window.clearTimeout(restoreTimer);
      delete target.dataset.highlighted;
    };
  }, [section]);

  return (
    <div className={`${pageShellCls} min-h-0 flex-1 overflow-hidden`}>
      <LocalDataNotice />
      <header className="shrink-0">
        <div className="flex items-center gap-1.5">
          <h1 className={pageTitleCls}>
            <Trans>设置</Trans>
          </h1>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <Trans>记录存在这台设备，记得定期备份。</Trans>
        </p>
      </header>
      {message ? (
        <Alert
          className="border-destructive/30 bg-destructive/5 p-3"
          role="alert"
        >
          <AlertDescription className="text-destructive">
            {message}
          </AlertDescription>
        </Alert>
      ) : notice ? (
        <p
          className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      <div
        ref={settingsRef}
        data-settings-viewport=""
        className={cls`min-h-0 flex-1 overflow-y-auto overscroll-y-contain flex flex-col gap-3 pb-3 ${settingsHighlightCls}`}
      >
        <p className={groupLabelCls}>
          <Trans>基础设置</Trans>
        </p>
        <section className={`${settingsCardCls} divide-y divide-border/60`}>
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <h2 className="flex items-center gap-1.5 text-sm font-medium">
              <Languages className="size-4 text-primary" aria-hidden="true" />
              <Trans>语言</Trans>
            </h2>
            <div className={preferenceControlCls}>
              <LanguageSwitcher currentLang={i18n.locale} display="label" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <h2 className="flex items-center gap-1.5 text-sm font-medium">
              <Palette className="size-4 text-primary" aria-hidden="true" />
              <Trans>主题</Trans>
            </h2>
            <div className={preferenceControlCls}>
              <ThemePicker display="label" />
            </div>
          </div>
        </section>
        <GroupingSettingsCard disabled={task !== null} />
        <p className={groupLabelCls}>
          <Trans>数据管理</Trans>
        </p>
        <CompanionAlbumSettings />
        <BackupSettings section={section} data={data} />
        <CleanupSettings data={data} />
        <p className={groupLabelCls}>
          <Trans>其他</Trans>
        </p>
        <section className={`${settingsCardCls} p-3`}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Smartphone
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                <Trans>放到主屏幕</Trans>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                <Trans>添加到主屏幕，方便下次打开记账。</Trans>
              </p>
            </div>
            <Companion mood="wave" className="block size-10 shrink-0" />
          </div>
          <div className="mt-3 [&>button]:min-h-11 [&>button]:w-full [&>button]:rounded-lg [&>button]:text-sm [&>button]:shadow-none [&>button]:border-border/60 [&>button]:bg-muted/30 [&>button]:text-foreground [&>button:hover]:bg-muted/70 [&>button:hover]:shadow-none">
            <InstallButton />
          </div>
          <OfflineStatus />
        </section>
        <SupportCard />
      </div>
    </div>
  );
}
