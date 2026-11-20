"use client";

import { Button } from "@landing-page/design-system";
import * as Dialog from "@radix-ui/react-dialog";
import { History, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type NovelPrompt,
  promptLabels,
  readNovelPrompts,
} from "./prompt-history";

function PromptHistoryList({ roomKey }: { roomKey: string }) {
  const [result, setResult] = useState<NovelPrompt[] | "error" | null>(null);

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
        className="px-5 py-8 text-center text-sm text-muted-foreground"
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
    <ol className="min-h-0 divide-y divide-border/60 overflow-y-auto overscroll-contain px-5">
      {result.map(({ id, kind, text, createdAt }) => (
        <li key={id} className="flex flex-col gap-2 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{promptLabels[kind]}</span>
            <time dateTime={new Date(createdAt).toISOString()}>
              {new Date(createdAt).toLocaleString("zh-CN", { hour12: false })}
            </time>
          </div>
          <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-6">
            {text}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function PromptHistoryDialog({ roomKey }: { roomKey: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline" size="sm">
          <History data-icon="inline-start" />
          提示词历史
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(75dvh,36rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border/70 bg-background shadow-lg">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
            <Dialog.Title className="text-base font-medium">
              提示词历史
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              从最新到最早显示已提交的写作要求。
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭"
                className="size-8"
              >
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <PromptHistoryList key={roomKey} roomKey={roomKey} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
