"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@landing-page/design-system";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown, FileDown, FileUp, Images, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  blobDataUrl,
  type CompanionAlbum,
  type CompanionMood,
  companionMoods,
  imageBlob,
  maxAlbumBytes,
  parseCompanionAlbum,
} from "@/lib/bbq/companion-album";
import {
  companionImages,
  replaceCompanionAlbum,
  saveCompanion,
} from "@/lib/bbq/companion-album-store";
import { prepareCompanion } from "@/lib/bbq/companion-image";
import { BbqCompanion } from "./bbq-companion";
import { detailsChevronCls, detailsMotionCls } from "./bbq-layout";
import { settingsCardCls, settingsSummaryCls } from "./bbq-settings-styles";
import { useCompanionAlbum } from "./companion-album-provider";

const moodLabels = {
  hello: msg`欢迎与提醒`,
  dance: msg`常用项目空状态`,
  chef: msg`饮食记录`,
  exercise: msg`热量统计`,
  shy: msg`记录空状态`,
  tumble: msg`休息状态`,
  wave: msg`安装与引导`,
  workout: msg`运动记录`,
  busy: msg`支出统计`,
  ponder: msg`数量统计`,
  happy: msg`已完成记录`,
  care: msg`待完成记录`,
  "photo-pose": msg`记录照片`,
};

export function CompanionAlbumSettings() {
  const { t, i18n } = useLingui();
  const { images, loading, error } = useCompanionAlbum();
  const [mood, setMood] = useState<CompanionMood>("hello");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const albumInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const count = Object.keys(images).length;

  async function run(action: () => Promise<void>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    setFailed(false);
    try {
      await action();
      setMessage(success);
    } catch {
      setFailed(true);
      setMessage(
        t`操作失败。请检查文件格式、图片大小及本机存储空间，原图集不会因导入失败而被清空。`,
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function importAlbum(file: File | undefined) {
    if (!file || busyRef.current) return;
    if (
      count &&
      !window.confirm(t`用导入的图集替换当前图集？未包含的场景将留空。`)
    )
      return;
    await run(async () => {
      if (file.size > maxAlbumBytes) throw new Error("album-size");
      const album = parseCompanionAlbum(await file.text());
      const rows = [];
      // Decode sequentially to bound peak memory; only replace after every image passes.
      for (const id of companionMoods) {
        const entry = album.images[id];
        if (entry)
          rows.push(
            await prepareCompanion(
              id,
              imageBlob(entry.src),
              entry.still ? imageBlob(entry.still) : undefined,
            ),
          );
      }
      await replaceCompanionAlbum(rows);
    }, t`图集已导入，页面配图已更新。`);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    await run(async () => {
      const row = await prepareCompanion(mood, file);
      await saveCompanion(row);
    }, t`场景图片已保存。`);
  }

  async function exportAlbum() {
    await run(async () => {
      const album: CompanionAlbum = {
        format: "luji-companions",
        version: 1,
        images: {},
      };
      for (const row of await companionImages.toArray()) {
        album.images[row.id] = {
          src: await blobDataUrl(row.image),
          still: await blobDataUrl(row.still),
        };
      }
      const blob = new Blob([JSON.stringify(album)], {
        type: "application/json",
      });
      if (blob.size > maxAlbumBytes) throw new Error("album-size");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "luji-companions.json";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, t`图集已导出，请在浏览器下载中查看。`);
  }

  return (
    <details className={`${settingsCardCls} ${detailsMotionCls}`}>
      <summary className={settingsSummaryCls}>
        <Images className="size-4 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1">
          <Trans>自定义图集</Trans>
        </h2>
        <ChevronDown className={detailsChevronCls} aria-hidden="true" />
      </summary>
      <div className="min-h-0 overflow-clip">
        <fieldset
          disabled={busy || loading || error}
          aria-busy={busy}
          className="flex min-w-0 flex-col gap-3 p-3 border-t border-border/60"
        >
          <legend className="sr-only">
            <Trans>自定义图集</Trans>
          </legend>
          <p className="text-xs text-muted-foreground">
            <Trans>
              未上传的场景不显示配图。图片仅保存在当前浏览器，不会上传到服务器；换设备请单独导出图集，账本备份不包含图集。
            </Trans>
          </p>
          <p className="text-xs" role="status">
            {loading ? t`读取图集中…` : t`已配置 ${count} / 13 个场景`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => albumInput.current?.click()}
            >
              <FileUp data-icon="inline-start" />
              <Trans>一键导入图集</Trans>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!count}
              onClick={() => void exportAlbum()}
            >
              <FileDown data-icon="inline-start" />
              <Trans>导出图集</Trans>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <Trans>
              导入记露图集 JSON（最大 100
              MB），或选择场景上传自己的图片（GIF、PNG、JPEG、WebP，单张最大 12
              MB）。
            </Trans>
          </p>
          <label className="flex flex-col gap-2 text-xs">
            <Trans>图片场景</Trans>
            <Select
              value={mood}
              onValueChange={(value) => setMood(value as CompanionMood)}
              disabled={busy || loading || error}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {companionMoods.map((id) => (
                    <SelectItem key={id} value={id}>
                      {i18n._(moodLabels[id])}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <div className="flex min-h-20 items-center gap-3">
            {images[mood] ? (
              <BbqCompanion mood={mood} className="block size-20 shrink-0" />
            ) : (
              <p className="text-xs text-muted-foreground">
                <Trans>此场景暂无图片</Trans>
              </p>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInput.current?.click()}
              >
                <Trans>上传 / 替换</Trans>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!images[mood]}
                onClick={() =>
                  void run(
                    () => companionImages.delete(mood),
                    t`场景图片已移除。`,
                  )
                }
              >
                <Trans>移除</Trans>
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!count}
            onClick={() => {
              if (
                window.confirm(t`清空本机图集？所有场景将留空，账目不受影响。`)
              )
                void run(() => companionImages.clear(), t`图集已清空。`);
            }}
          >
            <Trash2 data-icon="inline-start" />
            <Trans>清空图集</Trans>
          </Button>
          <input
            ref={albumInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label={t`一键导入图集`}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void importAlbum(file);
            }}
          />
          <input
            ref={imageInput}
            type="file"
            accept="image/gif,image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={t`上传场景图片`}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void uploadImage(file);
            }}
          />
          {busy ? (
            <p className="text-xs text-muted-foreground" role="status">
              <Trans>正在处理图集…</Trans>
            </p>
          ) : null}
        </fieldset>
        {error || failed ? (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertDescription className="text-destructive">
              {error ? t`无法读取本机图集，请检查浏览器存储权限。` : message}
            </AlertDescription>
          </Alert>
        ) : message ? (
          <p className="px-3 pb-3 text-xs text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </details>
  );
}
