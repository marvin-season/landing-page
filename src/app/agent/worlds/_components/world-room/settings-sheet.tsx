"use client";

import {
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
import { WorldEditor } from "../world-editor";

export function SettingsSheet({
  room,
  ended,
  editing,
  copying,
  presets,
  archive,
  onOpenChange,
  onSave,
}: {
  room: WorldRoom;
  ended: boolean;
  editing: WorldConfig | null;
  copying: boolean;
  presets: WorldPreset[];
  archive: ReactNode;
  onOpenChange: (open: boolean) => void;
  onSave: (config: WorldConfig) => Promise<void>;
}) {
  return (
    <Sheet open={Boolean(editing)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>{copying ? "复制为新世界" : "世界设定与存档"}</SheetTitle>
          <SheetDescription>
            修改设定只影响后续对话。秘密仅提供给对应角色。
          </SheetDescription>
        </SheetHeader>
        {editing && (!ended || copying) ? (
          <>
            {!copying ? (
              <div className="shrink-0 border-b border-border px-5 py-3">
                {archive}
              </div>
            ) : null}
            <WorldEditor
              key={`${copying}-${room.version}`}
              initial={editing}
              submitLabel={copying ? "创建世界" : "保存设定"}
              lockedMembers={!copying && room.status !== "draft"}
              presets={presets}
              onCancel={() => onOpenChange(false)}
              onSave={onSave}
            />
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {archive}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
