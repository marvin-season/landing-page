"use client";

import {
  Dialog,
  DialogContent,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@landing-page/design-system";
import type { ReactNode } from "react";
import type {
  WorldConfig,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import type { NovelWritingContext } from "../novel/model";
import { WorldEditor } from "../world-editor";

export function SettingsSheet({
  room,
  ended,
  editing,
  copying,
  presets,
  archive,
  includeNovelContext = false,
  novelContext = null,
  novelContextReady = false,
  onOpenChange,
  onSave,
}: {
  room: WorldRoom;
  ended: boolean;
  editing: WorldConfig | null;
  copying: boolean;
  presets: WorldPreset[];
  archive: ReactNode;
  includeNovelContext?: boolean;
  novelContext?: NovelWritingContext | null;
  novelContextReady?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    config: WorldConfig,
    novelContext?: NovelWritingContext,
  ) => Promise<void>;
}) {
  const novel = room.kind === "novel";
  const panel = (
    <>
      <SheetHeader className="shrink-0 pr-12">
        <SheetTitle>{copying ? "复制为新世界" : "世界设定与存档"}</SheetTitle>
        <SheetDescription>
          {novel
            ? "修改设定只影响后续章节。名称、文风和大纲也在这里。"
            : "修改设定只影响后续对话。秘密仅提供给对应角色。"}
        </SheetDescription>
      </SheetHeader>
      {editing && (!ended || copying) ? (
        <>
          {!copying ? (
            <div className="shrink-0 px-5 pb-1">{archive}</div>
          ) : null}
          {includeNovelContext && !novelContextReady ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              正在读取小说设定…
            </p>
          ) : (
            <WorldEditor
              key={`${copying}-${room.version}`}
              initial={editing}
              kind={room.kind}
              initialNovelContext={
                includeNovelContext && novelContext ? novelContext : undefined
              }
              submitLabel={copying ? "创建世界" : "保存设定"}
              lockedMembers={!novel && !copying && room.status !== "draft"}
              presets={presets}
              plain={novel}
              roomId={!copying && novel ? room.id : undefined}
              onCancel={() => onOpenChange(false)}
              onSave={onSave}
            />
          )}
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {archive}
        </div>
      )}
    </>
  );
  if (novel) {
    return (
      <Dialog open={Boolean(editing)} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(90dvh,60rem)] max-w-5xl gap-0">
          {panel}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={Boolean(editing)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-2xl">
        {panel}
      </SheetContent>
    </Sheet>
  );
}
