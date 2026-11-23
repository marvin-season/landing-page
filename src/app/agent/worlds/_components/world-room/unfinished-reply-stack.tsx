"use client";

import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import type { Character, WorldMessage } from "@/lib/group-chat/model";
import { MessageBubble } from "./message-bubble";

export function UnfinishedReplyStack({
  messages,
  characters,
  onRetry,
}: {
  messages: WorldMessage[];
  characters: Character[];
  onRetry: (message: WorldMessage) => (() => void) | undefined;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group/collapsible-trigger flex w-full cursor-pointer items-center gap-2 border-b border-border py-3 text-left text-xs text-muted-foreground">
        <CollapsibleChevron />
        <span>
          {messages.length > 1
            ? `${messages.length} 条未完成回复已折叠 · 展开可查看已生成片段`
            : "1 条未完成回复已折叠 · 展开可查看已生成片段"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            characters={characters}
            onRetry={onRetry(message)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
