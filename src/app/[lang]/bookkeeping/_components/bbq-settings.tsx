"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  DatabaseBackup,
  FileDown,
  FileUp,
  FolderDown,
  LoaderCircle,
  Smartphone,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatShanghaiDate } from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import type { BbqBackup } from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { bbqErrorMessage } from "./bbq-errors";
import { BbqInstallButton } from "./bbq-install-button";
import { cls, pageShellCls, pageTitleCls } from "./bbq-layout";
import { notifyBbqMenuChanged } from "./bbq-menu-events";
import { BbqSupportCard } from "./bbq-support-card";

const settingsActionCls = cls`
  min-h-11 w-full justify-start rounded-none px-3 text-sm shadow-none
  hover:bg-muted/70 hover:shadow-none focus-visible:ring-inset
`;

export function BbqSettings() {
  const { i18n, t } = useLingui();
  const importInputRef = useRef<HTMLInputElement>(null);
  const backupBusyRef = useRef(false);
  const [backupTask, setBackupTask] = useState<"import" | "export" | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function exportBackup(includePhotos = false) {
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupTask("export");
    setMessage(null);
    setNotice(null);
    try {
      const backup = await bbqStore.exportBackup({ includePhotos });
      downloadBackup(backup, includePhotos);
      setNotice(t`备份已生成，请在浏览器下载中查看`);
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
    } finally {
      backupBusyRef.current = false;
      setBackupTask(null);
    }
  }

  async function importFile(file: File | undefined) {
    if (!file || backupBusyRef.current) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text()) as unknown;
    } catch {
      setMessage(t`备份文件不正确`);
      return;
    }
    if (
      !window.confirm(t`把备份按编号合并进当前记账数据？相同编号的数据会更新。`)
    )
      return;
    backupBusyRef.current = true;
    setBackupTask("import");
    setNotice(null);
    setMessage(null);
    try {
      await bbqStore.importBackup(parsed as BbqBackup);
      notifyBbqMenuChanged();
      setMessage(null);
      setNotice(t`备份已导入，记录和常用项目已更新`);
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
    } finally {
      backupBusyRef.current = false;
      setBackupTask(null);
    }
  }

  return (
    <div className={`${pageShellCls} min-h-0 flex-1 overflow-hidden`}>
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain flex flex-col gap-4 pb-3">
        <section className="overflow-hidden rounded-xl bg-card shrink-0">
          <div className="border-b px-3 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <DatabaseBackup
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                <Trans>备份账本</Trans>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                <Trans>保存一份记录和常用项目，换设备也能带走。</Trans>
              </p>
            </div>
            <BbqCompanion mood="care" className="block size-16 shrink-0" />
          </div>
          <fieldset
            disabled={backupTask !== null}
            aria-busy={backupTask !== null}
            className="min-w-0 divide-y"
          >
            <Button
              type="button"
              variant="ghost"
              className={settingsActionCls}
              onClick={() => void exportBackup()}
            >
              <FileDown className="size-4" aria-hidden="true" />
              <Trans>导出备份（不含照片）</Trans>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={settingsActionCls}
              onClick={() => void exportBackup(true)}
            >
              <FolderDown className="size-4" aria-hidden="true" />
              <Trans>导出备份（包含照片）</Trans>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={settingsActionCls}
              onClick={() => importInputRef.current?.click()}
            >
              <FileUp className="size-4" aria-hidden="true" />
              <Trans>导入完整备份</Trans>
            </Button>
          </fieldset>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            disabled={backupTask !== null}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = "";
              void importFile(file);
            }}
          />
          {backupTask ? (
            <p
              className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground"
              role="status"
            >
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {backupTask === "import" ? t`导入中…` : t`导出中…`}
            </p>
          ) : null}
        </section>
        <section className="rounded-xl bg-card p-3 shrink-0">
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
            <BbqCompanion mood="wave" className="block size-16 shrink-0" />
          </div>
          <div className="mt-3 [&>button]:min-h-11 [&>button]:w-full [&>button]:rounded-lg [&>button]:text-sm [&>button]:shadow-none">
            <BbqInstallButton />
          </div>
        </section>
        <BbqSupportCard />
      </div>
    </div>
  );
}

function downloadBackup(backup: BbqBackup, includePhotos: boolean) {
  const blob = new Blob([JSON.stringify(backup)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const suffix = includePhotos ? "-with-photos" : "";
  link.download = `daily-ledger-backup${suffix}-${formatShanghaiDate(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
