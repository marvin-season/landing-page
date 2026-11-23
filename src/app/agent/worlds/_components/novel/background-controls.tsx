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
import { isDevelopment } from "@landing-page/utils";
import {
  Download,
  FileText,
  FolderOpen,
  GitFork,
  HardDrive,
  HardDriveDownload,
  History,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import {
  type ImportedNovel,
  maxNovelFileBytes,
  parseNovelFile,
} from "./import-novel";
import { type NovelBackground, serializeBackground } from "./model";
import type { NovelSyncDivergence } from "./novel-sync";

export function downloadBackground(background: NovelBackground) {
  const name = background.source.title.replace(/[\\/:*?"<>|]/g, "_") || "小说";
  // Keep the versioned envelope intact so another novel can validate the file.
  downloadText(
    `${name}-背景总结.md`,
    serializeBackground(background),
    "text/markdown;charset=utf-8",
  );
}

function syncPromptText(reason: NovelSyncDivergence) {
  const lead = {
    local: "本地正文在上次同步之后有修改。",
    server: "服务器上的小说在上次同步之后有修改。",
    both: "本地和服务器在上次同步之后都有修改。",
    unknown: "本地和服务器上的小说不一致。",
  }[reason];
  return `${lead}请选择同步方向。被覆盖的一份会留下唯一备份，更早的备份会被删除。`;
}

export function NovelFileControls({
  toolbar,
  disabled,
  canSummarize,
  hasChapters,
  importing,
  onImportingChange,
  onImport,
  onDownload,
  onFork,
  onSaveToServer,
  onSyncFromServer,
  onRestoreLocal,
  canRestoreLocal,
  syncPrompt,
  serverSynced,
  onSummarize,
}: {
  toolbar: HTMLElement | null;
  disabled: boolean;
  canSummarize: boolean;
  hasChapters: boolean;
  importing: boolean;
  onImportingChange: (importing: boolean) => void;
  onImport: (novel: ImportedNovel) => Promise<void>;
  onDownload: (format: "txt" | "md") => void;
  onFork: () => Promise<string>;
  onSaveToServer: () => Promise<string | null>;
  onSyncFromServer: () => Promise<string | null>;
  onRestoreLocal: () => Promise<string | null>;
  canRestoreLocal: boolean;
  syncPrompt: NovelSyncDivergence | null;
  serverSynced: boolean;
  onSummarize: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"" | "save" | "load" | "restore">("");
  const [forking, setForking] = useState(false);
  async function fork() {
    setError("");
    setForking(true);
    try {
      const id = await onFork();
      router.push(`/agent/worlds/${id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法复制小说。");
      setForking(false);
    }
  }
  function run(
    kind: "save" | "load" | "restore",
    action: () => Promise<string | null>,
  ) {
    setError("");
    setNotice("");
    setPending(kind);
    void action()
      .then((next) => {
        if (next) setNotice(next);
      })
      .catch((syncError) => {
        setError(
          syncError instanceof Error ? syncError.message : "同步小说失败。",
        );
      })
      .finally(() => setPending(""));
  }
  return (
    <>
      {toolbar
        ? createPortal(
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="小说文件"
                  title="小说文件"
                >
                  {importing ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin motion-reduce:animate-none"
                    />
                  ) : (
                    <FolderOpen data-icon="inline-start" />
                  )}
                  <span className="hidden sm:inline">文件</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={disabled || importing || forking}
                    onSelect={() => fileRef.current?.click()}
                  >
                    <Upload />
                    {importing ? "正在导入…" : "导入小说"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      disabled || importing || forking || Boolean(pending)
                    }
                    onSelect={() => void fork()}
                  >
                    <GitFork />
                    {forking ? "正在复制…" : "Fork"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={!hasChapters}
                    onSelect={() => onDownload("txt")}
                  >
                    <FileText />
                    导出整本 TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!hasChapters}
                    onSelect={() => onDownload("md")}
                  >
                    <FileText />
                    导出整本 Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      disabled ||
                      importing ||
                      forking ||
                      !canSummarize ||
                      !hasChapters
                    }
                    onSelect={onSummarize}
                  >
                    <Download />
                    总结并导出背景
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {isDevelopment ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {serverSynced ? (
                        <DropdownMenuItem disabled>
                          <HardDrive />
                          数据已同步
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem
                            disabled={
                              !hasChapters || forking || Boolean(pending)
                            }
                            onSelect={() => run("save", onSaveToServer)}
                          >
                            <HardDrive />
                            {pending === "save" ? "正在保存…" : "保存到服务器"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={forking || Boolean(pending)}
                            onSelect={() => run("load", onSyncFromServer)}
                          >
                            <HardDriveDownload />
                            {pending === "load" ? "正在同步…" : "从服务器同步"}
                          </DropdownMenuItem>
                        </>
                      )}
                      {canRestoreLocal ? (
                        <DropdownMenuItem
                          disabled={forking || Boolean(pending)}
                          onSelect={() => run("restore", onRestoreLocal)}
                        >
                          <History />
                          {pending === "restore" ? "正在恢复…" : "恢复本地备份"}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuGroup>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>,
            toolbar,
          )
        : null}
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        disabled={disabled || importing || forking}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || disabled || importing || forking) return;
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
      {isDevelopment && serverSynced ? (
        <p className="text-sm text-muted-foreground">数据已同步</p>
      ) : null}
      {isDevelopment && syncPrompt ? (
        <Alert>
          <AlertDescription>
            <span className="block">{syncPromptText(syncPrompt)}</span>
            <span className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || forking || Boolean(pending)}
                onClick={() => run("save", onSaveToServer)}
              >
                保存到服务器
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || forking || Boolean(pending)}
                onClick={() => run("load", onSyncFromServer)}
              >
                从服务器同步
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}
    </>
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
