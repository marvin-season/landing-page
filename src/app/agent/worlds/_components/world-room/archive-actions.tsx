"use client";

import { Button } from "@landing-page/design-system";
import { Copy, Download, Flag } from "lucide-react";
import { downloadText, worldRequest } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";

export function ArchiveActions({
  room,
  ended,
  pending,
  onPending,
  onCopy,
  onEnded,
}: {
  room: WorldRoom;
  ended: boolean;
  pending: boolean;
  onPending: (work: () => Promise<void>) => void;
  onCopy: () => void;
  onEnded: (room: WorldRoom) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          void onPending(async () => {
            const response = await fetch(
              `/api/group-chat/rooms/${room.id}/export?format=markdown`,
            );
            if (!response.ok) throw new Error("导出失败");
            downloadText(
              `${room.config.title}.md`,
              await response.text(),
              "text/markdown",
            );
          })
        }
      >
        <Download data-icon="inline-start" />
        导出对话
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          void onPending(async () => {
            const response = await fetch(
              `/api/group-chat/rooms/${room.id}/export?format=narration`,
            );
            if (!response.ok) throw new Error("导出失败");
            downloadText(
              `${room.config.title}-旁白叙事.md`,
              await response.text(),
              "text/markdown",
            );
          })
        }
      >
        <Download data-icon="inline-start" />
        导出旁白
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          void onPending(async () => {
            if (
              !window.confirm(
                "完整备份包含所有角色的秘密和私有设定，请妥善保管。是否导出？",
              )
            )
              return;
            const data = await worldRequest(`rooms/${room.id}/export`);
            downloadText(
              `${room.config.title}.json`,
              JSON.stringify(data, null, 2),
            );
          })
        }
      >
        完整备份
      </Button>
      <Button size="sm" variant="outline" onClick={onCopy}>
        <Copy data-icon="inline-start" />
        复制世界
      </Button>
      {!ended ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            void onPending(async () => {
              if (
                !window.confirm(
                  "结束这个故事？结束后只能查看与导出，也可以复制配置创建新世界。",
                )
              )
                return;
              const data = await worldRequest<{ room: WorldRoom }>(
                `rooms/${room.id}`,
                "PATCH",
                { action: "end" },
              );
              onEnded(data.room);
            })
          }
        >
          <Flag data-icon="inline-start" />
          结束故事
        </Button>
      ) : null}
    </div>
  );
}
