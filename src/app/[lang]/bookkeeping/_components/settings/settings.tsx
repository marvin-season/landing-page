"use client";

import { Alert, AlertDescription } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { Languages, Palette, Smartphone } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemePicker } from "@/components/theme/theme-picker";
import { useSettingsData } from "../../_hooks/use-settings-data";
import { Companion } from "../companion/companion";
import { CompanionAlbumSettings } from "../companion/companion-album-settings";
import { InstallButton } from "../pwa/install-button";
import { OfflineStatus } from "../pwa/offline-status";
import { BookkeepingHeader } from "../shared/bookkeeping-header";
import { BookkeepingCard, BookkeepingPage } from "../shared/bookkeeping-layout";
import { BackupSettings } from "./backup-settings";
import { CleanupSettings } from "./cleanup-settings";
import { GroupingSettingsCard } from "./grouping-settings";
import { SettingsGroupLabel, SettingsPreference } from "./settings-ui";
import { SupportCard } from "./support-card";

export function Settings() {
  const { i18n } = useLingui();
  const section = useSearchParams().get("section");
  const [openSection, setOpenSection] = useState<string | null>(section);
  const settingsRef = useRef<HTMLDivElement>(null);
  const data = useSettingsData();
  const { task, message, notice } = data;

  useEffect(() => {
    setOpenSection(section);
    if (section !== "backup" && section !== "companion-album") return;
    const target = settingsRef.current?.querySelector<HTMLElement>(
      `[data-settings-section="${section}"]`,
    );
    if (!target) return;
    const scrollFrame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
    });
    // 首屏绘制后再突出目标区域，留出足够时间辨认后平滑恢复。
    const highlightTimer = window.setTimeout(() => {
      target.dataset.highlighted = "true";
    }, 100);
    const restoreTimer = window.setTimeout(() => {
      delete target.dataset.highlighted;
    }, 3600);
    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(highlightTimer);
      window.clearTimeout(restoreTimer);
      delete target.dataset.highlighted;
    };
  }, [section]);

  return (
    <BookkeepingPage className="min-h-0 flex-1 overflow-hidden">
      <BookkeepingHeader
        title={<Trans>设置</Trans>}
        description={<Trans>记录存在这台设备，记得定期备份。</Trans>}
      />
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
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain flex flex-col gap-3 pb-3 [&_[data-settings-section]]:scroll-mt-2 [&_[data-settings-section]]:transition-[border-color] [&_[data-settings-section]]:duration-500 [&_[data-settings-section]>[data-slot=collapsible-trigger]]:transition-colors [&_[data-settings-section]>[data-slot=collapsible-trigger]]:duration-500 [&_[data-settings-section][data-highlighted]]:border-primary/40 [&_[data-settings-section][data-highlighted]>[data-slot=collapsible-trigger]]:bg-primary/5"
      >
        <SettingsGroupLabel>
          <Trans>基础设置</Trans>
        </SettingsGroupLabel>
        <BookkeepingCard className="divide-y divide-border/60">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <h2 className="flex items-center gap-1.5 text-sm font-medium">
              <Languages className="size-4 text-primary" aria-hidden="true" />
              <Trans>语言</Trans>
            </h2>
            <SettingsPreference>
              <LanguageSwitcher currentLang={i18n.locale} display="label" />
            </SettingsPreference>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <h2 className="flex items-center gap-1.5 text-sm font-medium">
              <Palette className="size-4 text-primary" aria-hidden="true" />
              <Trans>主题</Trans>
            </h2>
            <SettingsPreference>
              <ThemePicker display="label" />
            </SettingsPreference>
          </div>
        </BookkeepingCard>
        <GroupingSettingsCard disabled={task !== null} />
        <SettingsGroupLabel>
          <Trans>数据管理</Trans>
        </SettingsGroupLabel>
        <CompanionAlbumSettings
          open={openSection === "companion-album"}
          onOpenChange={(open) =>
            setOpenSection(open ? "companion-album" : null)
          }
        />
        <BackupSettings
          open={openSection === "backup"}
          onOpenChange={(open) => setOpenSection(open ? "backup" : null)}
          data={data}
        />
        <CleanupSettings
          open={openSection === "cleanup"}
          onOpenChange={(open) => setOpenSection(open ? "cleanup" : null)}
          data={data}
        />
        <SettingsGroupLabel>
          <Trans>其他</Trans>
        </SettingsGroupLabel>
        <BookkeepingCard variant="padded">
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
        </BookkeepingCard>
        <SupportCard />
      </div>
    </BookkeepingPage>
  );
}
