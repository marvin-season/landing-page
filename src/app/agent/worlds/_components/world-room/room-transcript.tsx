"use client";

import { Button } from "@landing-page/design-system";
import { useRef } from "react";
import type { StickToBottomContext } from "use-stick-to-bottom";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { WorldMessage, WorldRoom } from "@/lib/group-chat/model";
import { MessageBubble } from "./message-bubble";
import { transcriptRows } from "./transcript-rows";
import { UnfinishedReplyStack } from "./unfinished-reply-stack";

export function RoomTranscript({
  room,
  onAtTopChange,
  onLoadEarlier,
  onRetry,
}: {
  room: WorldRoom;
  onAtTopChange: (atTop: boolean) => void;
  onLoadEarlier: () => void;
  onRetry: (message: WorldMessage) => (() => void) | undefined;
}) {
  const conversation = useRef<StickToBottomContext>(null);
  return (
    <Conversation
      className="min-h-0"
      contextRef={conversation}
      onScrollCapture={(event) => {
        const scrollArea = conversation.current?.scrollRef.current;
        if (scrollArea && event.target === scrollArea) {
          onAtTopChange(scrollArea.scrollTop <= 0);
        }
      }}
    >
      <ConversationContent className="mx-auto w-full max-w-6xl gap-0 px-4 py-6 sm:px-6 after:h-[var(--composer-dock-height,0px)] after:shrink-0">
        {(room.messages[0]?.seq ?? 1) > 1 ? (
          <Button variant="ghost" size="sm" onClick={onLoadEarlier}>
            加载更早的对话
          </Button>
        ) : null}
        {!room.messages.length ? (
          <div className="flex flex-col gap-4 border-b border-border py-6">
            <p>开场</p>
            <h2 className="font-serif text-2xl font-normal">
              {room.config.title}
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-7">
              {room.config.background}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7">
              {room.config.scene}
            </p>
            <p className="text-xs leading-6 text-muted-foreground">
              你是系统操作者，所有登场人物都是
              NPC。故事会自动开始并持续推进，你可以观察，也可以随时输入指令改变事件、角色行动或故事走向。
            </p>
          </div>
        ) : null}
        {transcriptRows(room.messages).map((row) =>
          row.type === "folded" ? (
            <UnfinishedReplyStack
              key={row.id}
              messages={row.messages}
              characters={room.config.characters}
              onRetry={onRetry}
            />
          ) : (
            <MessageBubble
              key={row.message.id}
              message={row.message}
              characters={room.config.characters}
              onRetry={onRetry(row.message)}
            />
          ),
        )}
      </ConversationContent>
      <ConversationScrollButton className="bottom-[calc(var(--composer-dock-height,0px)+1rem)]" />
    </Conversation>
  );
}
