"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import {
  type ImportedNovel,
  maxNovelFileBytes,
  parseNovelFile,
} from "./import-novel";
import { type NovelBackground, serializeBackground } from "./model";

export function downloadBackground(background: NovelBackground) {
  const name = background.source.title.replace(/[\\/:*?"<>|]/g, "_") || "小说";
  // Keep the versioned envelope intact so another novel can validate the file.
  downloadText(
    `${name}-背景总结.md`,
    serializeBackground(background),
    "text/markdown;charset=utf-8",
  );
}

export function NovelFileControls({
  exported,
  disabled,
  canSummarize,
  importing,
  onImportingChange,
  onImport,
  onSummarize,
}: {
  exported: NovelBackground | null;
  disabled: boolean;
  canSummarize: boolean;
  importing: boolean;
  onImportingChange: (importing: boolean) => void;
  onImport: (novel: ImportedNovel) => Promise<void>;
  onSummarize: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">小说文件</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            支持 TXT 和 Markdown。导入会覆盖当前小说，请先导出需要保留的旧稿。
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
            {importing ? "正在导入…" : "导入已有小说"}
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
          if (!file || disabled || importing) return;
          setError("");
          onImportingChange(true);
          try {
            if (file.size > maxNovelFileBytes)
              throw new Error("小说文件不能超过 2 MB。");
            await onImport(parseNovelFile(await file.text(), file.name));
          } catch (error) {
            setError(error instanceof Error ? error.message : "小说导入失败。");
          } finally {
            onImportingChange(false);
          }
        }}
      />
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
