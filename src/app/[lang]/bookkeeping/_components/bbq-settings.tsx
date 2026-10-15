"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Input,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ChevronDown,
  DatabaseBackup,
  FileDown,
  FileUp,
  LoaderCircle,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatShanghaiDate } from "@/lib/bbq/business-day";
import { isValidCleanupRange } from "@/lib/bbq/cleanup";
import type { BbqBackup } from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { bbqErrorMessage } from "./bbq-errors";
import { BbqInstallButton } from "./bbq-install-button";
import {
  cls,
  detailsChevronCls,
  detailsMotionCls,
  detailsSummaryCls,
  pageShellCls,
  pageTitleCls,
} from "./bbq-layout";
import { notifyBbqMenuChanged } from "./bbq-menu-events";
import { BbqSupportCard } from "./bbq-support-card";

const settingsActionCls = cls`
  min-h-11 w-full justify-start rounded-none px-3 text-sm shadow-none
  hover:bg-muted/70 hover:shadow-none focus-visible:ring-inset
`;

const radioOptionCls = cls`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5 has-disabled:cursor-not-allowed has-disabled:opacity-50`;
const radioInputCls = cls`size-4 shrink-0 accent-primary`;

export function BbqSettings() {
  const { i18n, t } = useLingui();
  const importInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [task, setTask] = useState<"import" | "export" | "cleanup" | null>(
    null,
  );
  const [includePhotos, setIncludePhotos] = useState(false);
  const [photosOnly, setPhotosOnly] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function exportBackup() {
    if (busyRef.current) return;
    busyRef.current = true;
    setTask("export");
    setMessage(null);
    setNotice(null);
    try {
      const { bbqStore } = await import("@/lib/bbq/idb-store");
      const backup = await bbqStore.exportBackup({ includePhotos });
      downloadBackup(backup, includePhotos);
      setNotice(t`备份已生成，请在浏览器下载中查看`);
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
    } finally {
      busyRef.current = false;
      setTask(null);
    }
  }

  async function importFile(file: File | undefined) {
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setTask("import");
    setNotice(null);
    setMessage(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text()) as unknown;
      } catch {
        setMessage(t`备份文件不正确`);
        return;
      }
      if (
        !window.confirm(
          t`把备份按编号合并进当前记账数据？相同编号的数据会更新。`,
        )
      )
        return;
      const { bbqStore } = await import("@/lib/bbq/idb-store");
      await bbqStore.importBackup(parsed as BbqBackup);
      notifyBbqMenuChanged();
      setMessage(null);
      setNotice(t`备份已导入，记录和常用项目已更新`);
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
    } finally {
      busyRef.current = false;
      setTask(null);
    }
  }

  async function cleanup() {
    if (busyRef.current) return;
    setMessage(null);
    setNotice(null);
    if (!isValidCleanupRange(startDate, endDate)) {
      setMessage(t`请选择有效的起止日期，开始日期不能晚于结束日期`);
      return;
    }
    const confirmation = photosOnly
      ? t`确认移除 ${startDate} 至 ${endDate}（含起止日期）的记录图片？账目保留，图片无法撤销，请先备份。`
      : t`确认删除 ${startDate} 至 ${endDate}（含起止日期）的所有记录及图片？无法撤销，请先备份。`;
    if (!window.confirm(confirmation)) return;
    busyRef.current = true;
    setTask("cleanup");
    try {
      const { bbqStore } = await import("@/lib/bbq/idb-store");
      const { orderCount, photoCount } = await bbqStore.cleanupOrders({
        startDate,
        endDate,
        photosOnly,
      });
      setNotice(
        orderCount === 0
          ? t`所选范围内没有需要清理的数据`
          : photosOnly
            ? t`已移除 ${photoCount} 张图片，账目已保留`
            : t`已删除 ${orderCount} 条记录及 ${photoCount} 张图片`,
      );
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
    } finally {
      busyRef.current = false;
      setTask(null);
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
        <details
          className={`overflow-hidden rounded-xl bg-card shrink-0 ${detailsMotionCls}`}
        >
          <summary className={detailsSummaryCls}>
            <DatabaseBackup
              className="size-4 text-primary"
              aria-hidden="true"
            />
            <h2 className="min-w-0 flex-1">
              <Trans>备份账本</Trans>
            </h2>
            <BbqCompanion mood="care" className="block size-10 shrink-0" />
            <ChevronDown className={detailsChevronCls} aria-hidden="true" />
          </summary>
          <div className="min-h-0 overflow-clip">
            <div className="flex flex-col gap-3 p-3">
              <p className="text-xs text-muted-foreground">
                <Trans>保存一份记录和常用项目，换设备也能带走。</Trans>
              </p>
              <fieldset
                disabled={task !== null}
                aria-busy={task === "import" || task === "export"}
                className="min-w-0"
              >
                <legend className="mb-2 text-xs font-medium">
                  <Trans>导出图片</Trans>
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className={radioOptionCls}>
                    <input
                      type="radio"
                      name="backup-photos"
                      value="exclude"
                      checked={!includePhotos}
                      onChange={() => setIncludePhotos(false)}
                      className={radioInputCls}
                    />
                    <Trans>不含图片</Trans>
                  </label>
                  <label className={radioOptionCls}>
                    <input
                      type="radio"
                      name="backup-photos"
                      value="include"
                      checked={includePhotos}
                      onChange={() => setIncludePhotos(true)}
                      className={radioInputCls}
                    />
                    <Trans>包含图片</Trans>
                  </label>
                </div>
                <div className="mt-3 flex flex-col divide-y">
                  <Button
                    type="button"
                    variant="ghost"
                    className={settingsActionCls}
                    onClick={() => void exportBackup()}
                  >
                    <FileDown className="size-4" aria-hidden="true" />
                    <Trans>导出备份</Trans>
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
                </div>
              </fieldset>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                disabled={task !== null}
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  input.value = "";
                  void importFile(file);
                }}
              />
              {task === "import" || task === "export" ? (
                <p
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                  role="status"
                >
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {task === "import" ? t`导入中…` : t`导出中…`}
                </p>
              ) : null}
            </div>
          </div>
        </details>
        <details
          className={`overflow-hidden rounded-xl bg-card shrink-0 ${detailsMotionCls}`}
        >
          <summary className={detailsSummaryCls}>
            <Trash2 className="size-4 text-primary" aria-hidden="true" />
            <h2 className="min-w-0 flex-1">
              <Trans>清理瘦身</Trans>
            </h2>
            <ChevronDown className={detailsChevronCls} aria-hidden="true" />
          </summary>
          <div className="min-h-0 overflow-clip">
            <fieldset
              disabled={task !== null}
              aria-busy={task === "cleanup"}
              className="flex min-w-0 flex-col gap-3 p-3"
            >
              <legend className="sr-only">
                <Trans>清理瘦身</Trans>
              </legend>
              <p className="text-xs text-muted-foreground">
                <Trans>
                  按记账日期筛选，包含起止日期；常用项目与标签保留。
                </Trans>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-w-0 flex-col gap-1 text-xs">
                  <Trans>开始日期</Trans>
                  <Input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11"
                    required
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs">
                  <Trans>结束日期</Trans>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-11"
                    required
                  />
                </label>
              </div>
              <fieldset className="min-w-0">
                <legend className="mb-2 text-xs font-medium">
                  <Trans>清理内容</Trans>
                </legend>
                <div className="flex flex-col gap-2">
                  <label className={radioOptionCls}>
                    <input
                      type="radio"
                      name="cleanup-mode"
                      value="photos"
                      checked={photosOnly}
                      onChange={() => setPhotosOnly(true)}
                      className={radioInputCls}
                    />
                    <Trans>仅移除图片，保留账目</Trans>
                  </label>
                  <label className={radioOptionCls}>
                    <input
                      type="radio"
                      name="cleanup-mode"
                      value="records"
                      checked={!photosOnly}
                      onChange={() => setPhotosOnly(false)}
                      className={radioInputCls}
                    />
                    <Trans>移除记录及图片</Trans>
                  </label>
                </div>
              </fieldset>
              <p className="text-xs text-muted-foreground">
                <Trans>清理后无法撤销，建议先导出包含图片的备份。</Trans>
              </p>
              <Button
                type="button"
                variant="ghost"
                disabled={!isValidCleanupRange(startDate, endDate)}
                className="min-h-11 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void cleanup()}
              >
                {task === "cleanup" ? (
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {task === "cleanup" ? t`清理中…` : t`清理所选范围`}
              </Button>
            </fieldset>
          </div>
        </details>
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
