"use client";

import {
  Alert,
  AlertDescription,
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleDescription,
  CollapsibleTitle,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Progress,
} from "@landing-page/design-system";
import { LoaderCircle, Minimize2, Square } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import type { WorldRoom } from "@/lib/group-chat/model";
import { FieldGroup, TextField } from "../fields";
import {
  defaultCompressionRate,
  maxCompressionPromptLength,
  maxCompressionTarget,
  novelRequestBudget,
  novelRequestBytes,
} from "./context-compression";
import { chapterPrompt, novelCheckpointCount } from "./model";
import { localActionHint, NovelActionButton } from "./novel-action-tooltip";
import type { useNovel } from "./use-novel";

const number = new Intl.NumberFormat("zh-CN");

export function ContextControls({
  room,
  writer,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  room: WorldRoom;
  writer: Pick<
    ReturnType<typeof useNovel>,
    "novel" | "busy" | "error" | "compressing" | "compressContext" | "stop"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const { novel } = writer;
  const config = room.config;
  const [rate, setRate] = useState(defaultCompressionRate);
  const [compressionPrompt, setCompressionPrompt] = useState("");
  const rateId = useId();
  const chapterCount = novel.chapters.length;
  const { characters, bytes } = useMemo(() => {
    if (!open) return { characters: 0, bytes: 0 };
    const prompt = chapterPrompt(config, novel, chapterCount);
    return {
      characters: prompt.length,
      bytes: novelRequestBytes(room.id, prompt, "chapter"),
    };
  }, [config, novel, chapterCount, open, room.id]);
  const archivedCount = novelCheckpointCount(novel);
  const summary = archivedCount ? novel.checkpoint?.summary : undefined;
  const canCompress = chapterCount > 0 && room.status !== "ended";
  const pending = writer.busy;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="shrink-0 border-b border-border pr-12">
          <DialogTitle>续写上下文</DialogTitle>
          <DialogDescription>书末续写</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs tabular-nums text-muted-foreground">
              {number.format(characters)} /{" "}
              {number.format(novelRequestBudget.characters)} 字符 ·{" "}
              {number.format(Math.round(bytes / 1024))} /{" "}
              {novelRequestBudget.bytes / 1024} KiB
              {archivedCount ? ` · 前 ${archivedCount} 章使用摘要` : ""}
            </p>
            <Progress
              aria-label="续写请求占用"
              value={Math.min(
                100,
                Math.max(
                  characters / novelRequestBudget.characters,
                  bytes / novelRequestBudget.bytes,
                ) * 100,
              )}
            />
          </div>
          {summary ? (
            <Collapsible>
              <CollapsibleTrigger variant="default">
                <CollapsibleTitle>摘要预览</CollapsibleTitle>
                <CollapsibleDescription>
                  前 {archivedCount} 章
                </CollapsibleDescription>
                <CollapsibleChevron />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 pt-3">
                <UnifiedMarkdown content={summary} />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
          {canCompress ? (
            <fieldset disabled={pending}>
              <FieldGroup>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={rateId} className="text-sm font-medium">
                      压缩率
                    </label>
                    <span className="text-sm tabular-nums">{rate}%</span>
                  </div>
                  <Input
                    id={rateId}
                    type="range"
                    min={1}
                    max={99}
                    value={rate}
                    aria-valuetext={`${rate}%`}
                    onChange={(event) =>
                      setRate(event.currentTarget.valueAsNumber)
                    }
                    className="h-5 cursor-pointer border-0 px-0 py-0 accent-primary shadow-none dark:bg-transparent shinchan:bg-transparent apple:bg-transparent apple:backdrop-blur-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    目标约为原文的 {100 - rate}%，最多 {maxCompressionTarget} 字
                  </p>
                </div>
                <TextField
                  label="压缩提示词（选填）"
                  value={compressionPrompt}
                  onChange={setCompressionPrompt}
                  maxLength={maxCompressionPromptLength}
                  multiline
                />
              </FieldGroup>
            </fieldset>
          ) : null}
          {writer.compressing ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              正在压缩模型上下文…
            </p>
          ) : null}
          {writer.error ? (
            <Alert>
              <AlertDescription>{writer.error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter className="shrink-0 border-t border-border sm:flex-row sm:justify-end">
          {writer.compressing ? (
            <NovelActionButton
              hint={localActionHint("停止当前压缩，不保存未完成的摘要。")}
              variant="outline"
              onClick={writer.stop}
            >
              <Square data-icon="inline-start" />
              停止压缩
            </NovelActionButton>
          ) : (
            <NovelActionButton
              hint={{
                action: "分批生成供续写使用的剧情摘要，保留章节原文。",
                context:
                  "完整世界设定、书名、已有摘要或导入背景、本批正文、摘要目标字数和压缩提示词。",
              }}
              variant="outline"
              disabled={!canCompress || pending}
              onClick={() => {
                writer.compressContext({
                  rate,
                  instructions: compressionPrompt,
                });
              }}
            >
              <Minimize2 data-icon="inline-start" />
              压缩上下文
            </NovelActionButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
