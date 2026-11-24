"use client";

import { Button } from "@landing-page/design-system";
import * as Dialog from "@radix-ui/react-dialog";
import { History, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useReusePrompt } from "./chapter-prompt-reuse";
import { type NovelPrompt, readNovelPrompts } from "./prompt-history";

function PromptHistoryList({
  roomKey,
  onUsePrompt,
}: {
  roomKey: string;
  onUsePrompt: (text: string) => boolean;
}) {
  const [result, setResult] = useState<NovelPrompt[] | "error" | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    void readNovelPrompts(roomKey).then(
      (prompts) => {
        if (active) setResult(prompts);
      },
      () => {
        if (active) setResult("error");
      },
    );
    return () => {
      active = false;
    };
  }, [roomKey]);

  if (!result || result === "error" || result.length === 0) {
    return (
      <p
        role="status"
        className="px-4 py-5 text-center text-sm text-muted-foreground"
      >
        {result === "error"
          ? "无法读取提示词历史。"
          : result
            ? "暂无提示词记录。"
            : "正在读取…"}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      {blocked ? (
        <p role="status" className="px-4 pt-2 text-xs text-muted-foreground">
          当前无法填入。正在生成、导入，或故事已结束时请稍后再试。
        </p>
      ) : null}
      <ol className="min-h-0 divide-y divide-border/60 overflow-y-auto overscroll-contain px-4">
        {result.map(({ id, text, createdAt }) => (
          <li key={id} className="flex flex-col gap-1.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <time
                className="text-xs text-muted-foreground"
                dateTime={new Date(createdAt).toISOString()}
              >
                {new Date(createdAt).toLocaleString("zh-CN", { hour12: false })}
              </time>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => {
                  if (onUsePrompt(text)) return;
                  setBlocked(true);
                }}
              >
                填入
              </Button>
            </div>
            <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-5">
              {text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PromptHistoryDialog({ roomKey }: { roomKey: string }) {
  const [open, setOpen] = useState(false);
  const reusePrompt = useReusePrompt();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="提示词历史"
          title="提示词历史"
        >
          <History data-icon="inline-start" />
          <span className="hidden sm:inline">提示词历史</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(75dvh,36rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border/70 bg-background shadow-lg">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
            <Dialog.Title className="text-sm font-medium">
              提示词历史
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              从最新到最早显示已提交的写作要求。点「填入」写入当前输入框，不会自动提交。
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭"
                className="size-7"
              >
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <PromptHistoryList
            key={roomKey}
            roomKey={roomKey}
            onUsePrompt={(text) => {
              if (!reusePrompt(text)) return false;
              setOpen(false);
              return true;
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
