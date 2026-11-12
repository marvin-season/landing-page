"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { Loader2, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { Link } from "@/components/link/link";
import { worldRequest } from "@/lib/group-chat/client";
import type { RoomListItem } from "@/lib/group-chat/model";
import { SidebarListLink } from "./sidebar-list-link";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

function roomStatus(room: RoomListItem) {
  if (room.status === "ended") return "已结束";
  if (room.status === "draft") return "未开始";
  if (room.paused) return "已暂停";
  return "进行中";
}

export function WorldsListContent({
  onItemClick,
  className,
}: {
  onItemClick?: () => void;
  className?: string;
}) {
  const params = useParams();
  const roomId = typeof params.roomId === "string" ? params.roomId : null;
  const rooms = useQuery({
    queryKey: ["world-rooms"],
    queryFn: () => worldRequest<{ rooms: RoomListItem[] }>("rooms"),
  });

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 p-2">
        <Button asChild className="w-full justify-center gap-2">
          <Link href="/agent/worlds" onClick={onItemClick}>
            <Plus className="size-4" />
            创建世界
          </Link>
        </Button>
      </div>

      {rooms.error ? (
        <div className="mx-3 mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {rooms.error.message}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {rooms.isPending ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载中…
          </div>
        ) : rooms.data?.rooms.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            暂无世界
          </div>
        ) : (
          <ul className="space-y-0.5">
            {rooms.data?.rooms.map((room) => (
              <li key={room.id}>
                <SidebarListLink
                  href={`/agent/worlds/${room.id}`}
                  onClick={onItemClick}
                  active={roomId === room.id}
                  className="block"
                >
                  <span className="block truncate leading-5">{room.title}</span>
                  <span className="block text-[11px] font-normal leading-4 text-muted-foreground">
                    {roomStatus(room)} · {dayjs(room.updatedAt).fromNow()}
                  </span>
                </SidebarListLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
