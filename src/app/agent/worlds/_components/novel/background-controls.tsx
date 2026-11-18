"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import { TextField } from "../fields";
import {
  type ImportedNovelBackground,
  maxBackgroundFileBytes,
  maxNovelSummaryLength,
  type NovelBackground,
  parseImportedBackground,
  serializeBackground,
} from "./model";

export function downloadBackground(background: NovelBackground) {
  const name = background.source.title.replace(/[\\/:*?"<>|]/g, "_") || "小说";
  // Keep the versioned envelope intact so another novel can validate the file.
  downloadText(
    `${name}-背景总结.md`,
    serializeBackground(background),
    "text/markdown;charset=utf-8",
  );
}

export function BackgroundControls({
  background,
  exported,
  disabled,
  canSummarize,
  onImport,
  onSummarize,
}: {
  background?: ImportedNovelBackground;
  exported: NovelBackground | null;
  disabled: boolean;
  canSummarize: boolean;
  onImport: (background: ImportedNovelBackground | undefined) => void;
  onSummarize: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">跨小说背景</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            总结已完成剧情和人物状态，导出后可在另一部小说中导入作为背景。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || importing || !canSummarize}
            onClick={onSummarize}
          >
            <Download data-icon="inline-start" />
            总结并导出背景
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || importing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            {importing
              ? "正在导入…"
              : background
                ? "替换导入背景"
                : "导入背景（TXT / MD）"}
          </Button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        disabled={disabled || importing}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError("");
          setImporting(true);
          try {
            if (file.size > maxBackgroundFileBytes)
              throw new Error("背景文件不能超过 2 MB");
            onImport(parseImportedBackground(await file.text(), file.name));
          } catch (error) {
            setError(error instanceof Error ? error.message : "背景导入失败");
          } finally {
            setImporting(false);
          }
        }}
      />
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {background ? (
        <fieldset
          disabled={disabled || importing}
          className="flex flex-col gap-3 disabled:opacity-60"
        >
          {background.format === "novel-background" ? (
            <p className="text-xs text-muted-foreground">
              背景来源：《{background.source.title}》· 截至第{" "}
              {background.source.chapterCount}{" "}
              章。包含原世界设定；导入不会覆盖本书设定或追加章节。
            </p>
          ) : null}
          <TextField
            label="已导入的剧情背景"
            value={background.summary}
            multiline
            maxLength={maxNovelSummaryLength}
            onChange={(summary) => onImport({ ...background, summary })}
            hint={
              background.format === "novel-background"
                ? "后续章节会参考此背景。可编辑总结，原小说的角色秘密仍按知情范围逐步揭示。"
                : undefined
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onClick={() => onImport(undefined)}
          >
            移除导入背景
          </Button>
        </fieldset>
      ) : null}
      {exported ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              《{exported.source.title}》· 前 {exported.source.chapterCount}{" "}
              章背景总结
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadBackground(exported)}
            >
              再次导出总结
            </Button>
          </div>
          <UnifiedMarkdown content={exported.summary} />
        </div>
      ) : null}
    </section>
  );
}
