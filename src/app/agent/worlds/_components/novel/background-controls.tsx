"use client";

import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import { ChevronDown, Download, FileText, Upload } from "lucide-react";
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
  disabled,
  canSummarize,
  hasChapters,
  importing,
  onImportingChange,
  onImport,
  onDownload,
  onSummarize,
}: {
  disabled: boolean;
  canSummarize: boolean;
  hasChapters: boolean;
  importing: boolean;
  onImportingChange: (importing: boolean) => void;
  onImport: (novel: ImportedNovel) => Promise<void>;
  onDownload: (format: "txt" | "md") => void;
  onSummarize: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || importing}
          onClick={() => fileRef.current?.click()}
        >
          <Upload data-icon="inline-start" />
          {importing ? "正在导入…" : "导入小说"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={!hasChapters}>
              <Download data-icon="inline-start" />
              导出
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => onDownload("txt")}>
                <FileText />
                导出整本 TXT
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDownload("md")}>
                <FileText />
                导出整本 Markdown
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={disabled || importing || !canSummarize}
                onSelect={onSummarize}
              >
                <Download />
                总结并导出背景
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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
    </div>
  );
}

export function NovelBackgroundPreview({
  exported,
}: {
  exported: NovelBackground;
}) {
  return (
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
          <Download data-icon="inline-start" />
          再次导出总结
        </Button>
      </div>
      <UnifiedMarkdown content={exported.summary} />
    </div>
  );
}
