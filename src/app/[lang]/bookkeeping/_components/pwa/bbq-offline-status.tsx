"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { useBbqOffline } from "./bbq-offline-provider";

export function BbqOfflineStatus() {
  const offline = useBbqOffline();
  const { t } = useLingui();
  const [storage, setStorage] = useState<
    "available" | "saved" | "denied" | null
  >(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (
      typeof navigator.storage?.persisted === "function" &&
      typeof navigator.storage?.persist === "function"
    ) {
      void navigator.storage
        .persisted()
        .then((persisted) => {
          if (!cancelled) setStorage(persisted ? "saved" : "available");
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function protectStorage() {
    setRequesting(true);
    try {
      setStorage((await navigator.storage.persist()) ? "saved" : "denied");
    } catch {
      setStorage("denied");
    } finally {
      setRequesting(false);
    }
  }

  if (!offline) return null;
  const message =
    offline.status === "ready"
      ? t`已可离线使用：关闭后重新打开，也能记账和查看本机数据。`
      : offline.status === "preparing"
        ? t`正在准备离线资源，请保持联网…`
        : offline.status === "error"
          ? t`离线资源尚未准备完成，请联网后重试。`
          : offline.status === "development"
            ? t`开发模式不启用离线缓存，请在正式部署后使用。`
            : t`当前浏览器、地址或语言暂不支持离线准备，请使用 HTTPS 下的中文、英文或日文页面。`;

  return (
    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
      <p role="status">{message}</p>
      {offline.status === "error" ? (
        <Button type="button" variant="outline" onClick={offline.retry}>
          <Trans>重新准备离线资源</Trans>
        </Button>
      ) : null}
      {offline.updateAvailable ? (
        <p role="status">
          <Trans>新版本已就绪，关闭所有记账窗口后重新打开即可更新。</Trans>
        </p>
      ) : null}
      {storage === "saved" ? (
        <p>
          <Trans>
            已启用持久存储。清除浏览器数据仍会删除账本，请定期导出备份。
          </Trans>
        </p>
      ) : storage ? (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={requesting}
            onClick={() => void protectStorage()}
          >
            <Trans>保护本机存储</Trans>
          </Button>
          {storage === "denied" ? (
            <p role="status">
              <Trans>浏览器暂未授予持久存储，请继续定期导出备份。</Trans>
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
