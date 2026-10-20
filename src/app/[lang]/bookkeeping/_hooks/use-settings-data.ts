import { useLingui } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { formatShanghaiDate } from "@/lib/bbq/business-day";
import { isValidCleanupRange } from "@/lib/bbq/cleanup";
import type { BbqBackup } from "@/lib/bbq/types";
import { errorMessage } from "../_lib/errors";
import { notifyMenuChanged } from "../_lib/menu-events";

export function useSettingsData() {
  const { i18n, t } = useLingui();
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
      setMessage(errorMessage(i18n, error));
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
      notifyMenuChanged();
      setMessage(null);
      setNotice(t`备份已导入，记录和常用项目已更新`);
    } catch (error) {
      setMessage(errorMessage(i18n, error));
    } finally {
      busyRef.current = false;
      setTask(null);
    }
  }

  async function importSamples() {
    if (busyRef.current) return;
    busyRef.current = true;
    setTask("import");
    setMessage(null);
    setNotice(null);
    try {
      const [{ bbqStore }, { createSampleBackup }] = await Promise.all([
        import("@/lib/bbq/idb-store"),
        import("@/lib/bbq/sample-backup"),
      ]);
      const existing = await bbqStore.exportBackup();
      await bbqStore.importBackup(createSampleBackup(new Date(), existing));
      notifyMenuChanged();
      setNotice(t`示例数据已导入，已有数据保留。`);
    } catch (error) {
      setMessage(errorMessage(i18n, error));
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
      setMessage(errorMessage(i18n, error));
    } finally {
      busyRef.current = false;
      setTask(null);
    }
  }

  return {
    task,
    includePhotos,
    setIncludePhotos,
    photosOnly,
    setPhotosOnly,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    message,
    notice,
    exportBackup,
    importFile,
    importSamples,
    cleanup,
  };
}

export type SettingsData = ReturnType<typeof useSettingsData>;

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
