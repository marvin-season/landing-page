"use client";

import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@landing-page/design-system";
import type { ReactNode } from "react";
import type { WorldRoom } from "@/lib/group-chat/model";
import { CharacterAvatar } from "../character-avatar";

function NoteCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-b border-border py-3">
      {title ? (
        <h3 className="text-xs tracking-wide text-muted-foreground">{title}</h3>
      ) : null}
      {children}
    </section>
  );
}

export function WorldNotes({
  room,
  onMention,
}: {
  room: WorldRoom;
  onMention?: (id: string) => void;
}) {
  const novel = room.kind === "novel";
  return (
    <div className="flex flex-col text-sm">
      <h3 className="mb-1">登场</h3>
      {!novel ? (
        <NoteCard>
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center text-xs text-muted-foreground">
              系
            </span>
            <p className="min-w-0 flex-1 truncate font-medium">系统 · 你</p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {room.config.storyGoal ||
              "默认以系统身份干预。输入框上方可以改成旁白或任意角色。"}
          </p>
        </NoteCard>
      ) : null}
      {!novel && room.config.narration ? (
        <NoteCard>
          <p className="font-medium">旁白</p>
          <p className="text-xs leading-5 text-muted-foreground">
            只负责场景和事件。对话角色不在自己的发言里写旁白。
          </p>
        </NoteCard>
      ) : null}
      {room.config.characters.map((c) => (
        <NoteCard key={c.id}>
          <div className="flex items-center gap-2">
            <CharacterAvatar
              id={c.id}
              name={c.name}
              avatar={c.avatar}
              size="md"
            />
            <p className="min-w-0 flex-1 truncate font-medium">
              {c.name}
              {novel || c.enabled ? "" : " · 已禁用"}
            </p>
            {onMention ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2"
                disabled={!c.enabled || room.status === "ended"}
                onClick={() => onMention(c.id)}
              >
                点名
              </Button>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {c.identity}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {c.publicInfo || c.personality}
          </p>
        </NoteCard>
      ))}
      <NoteCard title="背景故事">
        <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {room.config.background}
        </p>
      </NoteCard>
      {room.config.priorContext ? (
        <NoteCard title="前置剧情">
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {room.config.priorContext}
          </p>
        </NoteCard>
      ) : null}
      <NoteCard title="当前场景">
        <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {room.config.scene}
        </p>
      </NoteCard>
      {room.config.facts ? (
        <NoteCard title="已确认事实">
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {room.config.facts}
          </p>
        </NoteCard>
      ) : null}
      {room.summary ? (
        <NoteCard title="剧情摘要">
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {room.summary.text}
          </p>
        </NoteCard>
      ) : null}
      <NoteCard title="世界规则">
        <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {room.config.rules ||
            (novel ? "无额外规则" : "NPC 自主行动，按当前需求持续推进。")}
        </p>
      </NoteCard>
      {room.run ? (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          本轮 {room.run.turns}/{room.run.limit} 条发言 · {room.run.calls}{" "}
          次调用
          <br />
          {room.run.usage.reportedCalls
            ? `${room.run.usage.input + room.run.usage.output} tokens（${room.run.usage.reportedCalls}/${room.run.calls} 次调用报告用量，费用未知）`
            : "用量与费用未知"}
        </p>
      ) : null}
    </div>
  );
}

export function WorldNotesSheet({
  open,
  room,
  onOpenChange,
  onMention,
}: {
  open: boolean;
  room: WorldRoom;
  onOpenChange: (open: boolean) => void;
  onMention?: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>世界与角色</SheetTitle>
          <SheetDescription>公开设定与当前剧情</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <WorldNotes room={room} onMention={onMention} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
