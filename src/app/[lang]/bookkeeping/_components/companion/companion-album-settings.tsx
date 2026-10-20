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
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  blobDataUrl,
  type CompanionAlbum,
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
import { detailsChevronCls, detailsMotionCls } from "../../_styles/bbq-layout";
import {
  settingsCardCls,
  settingsSummaryCls,
} from "../../_styles/bbq-settings-styles";
import { BbqCompanion } from "./bbq-companion";
import { useCompanionAlbum } from "./companion-album-provider";

const moodLabels = {
  hello: msg`备份提醒 / 未选项目 / 记录 · 暂无记录`,
  dance: msg`常用 · 暂无项目 / 记录 · 列表顶部`,
  chef: msg`常用 · 添加项目 / 记一笔 · 分组下未选项目`,
  exercise: msg`统计 · 热量图表旁`,
  wave: msg`设置 · 安装应用卡片`,
  busy: msg`统计 · 金额图表旁`,
  ponder: msg`统计 · 记录数图表旁 / 暂无数据`,
};
type SelectableMood = keyof typeof moodLabels;
// Only offer images used by the UI; keep legacy moods compatible with saved packs.
const selectableMoods = Object.keys(moodLabels) as SelectableMood[];
const sceneCount = selectableMoods.length;

export function CompanionAlbumSettings() {
  const { t, i18n } = useLingui();
  const searchParams = useSearchParams();
  const { images, loading, error } = useCompanionAlbum();
  const [mood, setMood] = useState<SelectableMood>("hello");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const albumInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const count = Object.keys(images).length;
  const configuredCount = selectableMoods.filter((id) => images[id]).length;

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
      // Export only selectable scenes; legacy images may still exist in storage.
      for (const row of await companionImages.bulkGet(selectableMoods)) {
        if (!row) continue;
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
    <details
      data-settings-section="companion-album"
      open={searchParams.get("section") === "companion-album"}
      className={`${settingsCardCls} ${detailsMotionCls}`}
    >
      <summary className={settingsSummaryCls}>
        <Images className="size-4 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1">
          <Trans>自定义图集</Trans>
        </h2>
        <span className="text-xs text-muted-foreground" role="status">
          {loading
            ? t`读取图集中…`
            : t`已配置 ${configuredCount} / ${sceneCount} 个场景`}
        </span>
        <ChevronDown className={detailsChevronCls} aria-hidden="true" />
      </summary>
      <div className="min-h-0 overflow-clip">
        <fieldset
          disabled={busy || loading || error}
          aria-busy={busy}
          className="flex min-w-0 flex-col gap-2 p-3 border-t border-border/60 [&_[data-icon]]:size-3.5 [&_[data-icon]]:shrink-0"
        >
          <legend className="sr-only">
            <Trans>自定义图集</Trans>
          </legend>
          <div className="grid grid-cols-2 gap-2 mb-1">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              className="h-9 min-w-0 rounded-lg px-3"
              onClick={() => albumInput.current?.click()}
            >
              <FileUp data-icon="inline-start" />
              <Trans>一键导入图集</Trans>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-w-0 rounded-lg px-3"
              disabled={!configuredCount}
              onClick={() => void exportAlbum()}
            >
              <FileDown data-icon="inline-start" />
              <Trans>导出图集</Trans>
            </Button>
            <a
              href="https://github.com/marvin-season/landing-page/releases/download/luji-companions-v1/luji-companions.json"
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 w-fit justify-self-end text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              <Trans>下载示例图集</Trans>
            </a>
          </div>
          <label className="flex flex-col gap-1.5 text-xs">
            <Trans>选择要更换图片的位置</Trans>
            <Select
              value={mood}
              onValueChange={(value) => setMood(value as SelectableMood)}
              disabled={busy || loading || error}
            >
              <SelectTrigger size="sm" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {selectableMoods.map((id) => (
                    <SelectItem key={id} value={id}>
                      {i18n._(moodLabels[id])}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <div className="flex min-h-14 items-center gap-2">
            {images[mood] ? (
              <BbqCompanion mood={mood} className="block size-14 shrink-0" />
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
                onClick={() => {
                  if (
                    !window.confirm(
                      t`移除这张配图？所有使用这张图片的位置将不再显示配图，账目不受影响。`,
                    )
                  )
                    return;
                  void run(
                    () => companionImages.delete(mood),
                    t`场景图片已移除。`,
                  );
                }}
              >
                <Trans>移除</Trans>
              </Button>
            </div>
          </div>
          <div className="flex items-start justify-between gap-2">
            <details className="min-w-0 flex-1 text-xs text-muted-foreground">
              <summary className="w-fit cursor-pointer py-2">
                <Trans>图集说明</Trans>
              </summary>
              <div className="flex flex-col gap-1.5 pb-1">
                <p>
                  <Trans>
                    约 23 MB。下载后点击“一键导入图集”，选择下载的 JSON 文件。
                  </Trans>
                </p>
                <p>
                  <Trans>
                    导入记露图集 JSON（最大 100
                    MB），或选择场景上传自己的图片（GIF、PNG、JPEG、WebP，单张最大
                    12 MB）。
                  </Trans>
                </p>
                <p>
                  <Trans>
                    未上传的场景不显示配图。图片仅保存在当前浏览器，不会上传到服务器；换设备请单独导出图集，账本备份不包含图集。
                  </Trans>
                </p>
              </div>
            </details>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!count}
              onClick={() => {
                if (
                  window.confirm(
                    t`清空本机图集？所有场景将留空，账目不受影响。`,
                  )
                )
                  void run(() => companionImages.clear(), t`图集已清空。`);
              }}
            >
              <Trash2 data-icon="inline-start" />
              <Trans>清空图集</Trans>
            </Button>
          </div>
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
