"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { RotateCcw } from "lucide-react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import type { Character, WorldMessage } from "@/lib/group-chat/model";
import { CharacterAvatar } from "../character-avatar";
import { isUnfinishedReply } from "./transcript-rows";

export function MessageBubble({
  message,
  characters,
  onRetry,
}: {
  message: WorldMessage;
  characters: Character[];
  onRetry?: () => void;
}) {
  if (message.kind === "system") return <p>{message.text}</p>;
  const user = message.kind === "intervention";
  const narrator = message.kind === "narrator";
  const displayName = narrator ? "旁白" : message.name;
  const missingMentions = message.mentions
    .map(
      (id) =>
        `@${characters.find((character) => character.id === id)?.name ?? id}`,
    )
    .filter((name) => !message.text.includes(name));
  const text = [...missingMentions, message.text].filter(Boolean).join(" ");
  const unfinished = isUnfinishedReply(message);
  const character = characters.find((item) => item.id === message.speakerId);
  const role = narrator
    ? message.operator
      ? "你"
      : "场景"
    : user
      ? "系统指令"
      : message.operator
        ? "你"
        : (character?.identity ?? "NPC");
  return (
    <article
      className={cn(
        "flex items-start gap-3 border-b border-border py-4",
        unfinished && "opacity-60",
      )}
    >
      {narrator ? null : character ? (
        <CharacterAvatar
          id={character.id}
          name={character.name}
          avatar={character.avatar}
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center text-xs text-muted-foreground">
          {displayName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{displayName}</span>
          <span className="min-w-0 max-w-48 truncate">{role}</span>
          <time className="ml-auto shrink-0 tabular-nums">
            {new Date(message.createdAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
        <div className="mt-1.5 text-sm leading-7">
          {text ? (
            <UnifiedMarkdown
              content={text}
              hasNextChunk={message.status === "streaming"}
            />
          ) : (
            <span className="text-muted-foreground">
              {message.status === "streaming"
                ? "正在组织语言…"
                : "本次未完成回复"}
            </span>
          )}
        </div>
        {unfinished ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>未完成 · 不计入后续剧情</span>
            {onRetry ? (
              <Button size="sm" variant="ghost" onClick={onRetry}>
                <RotateCcw data-icon="inline-start" />
                重试这一条
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
