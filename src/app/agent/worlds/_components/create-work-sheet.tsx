"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@landing-page/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/shadcn-io/tabs";
import { worldRequest } from "@/lib/group-chat/client";
import type {
  WorldConfig,
  WorldKind,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import { WorldEditor } from "./world-editor";

export type CreateWorkDraft = {
  config: WorldConfig;
  kind: WorldKind;
  derived: boolean;
  sourceTemplateId?: string;
};

export function startCreateWork(
  config: WorldConfig,
  options: {
    derived?: boolean;
    kind?: WorldKind;
    sourceTemplateId?: string;
  } = {},
): CreateWorkDraft {
  return {
    config: structuredClone(config),
    kind: options.kind ?? "script",
    derived: options.derived ?? false,
    sourceTemplateId: options.sourceTemplateId,
  };
}

export function CreateWorkSheet({
  editing,
  setEditing,
  presets,
}: {
  editing: CreateWorkDraft | null;
  setEditing: Dispatch<SetStateAction<CreateWorkDraft | null>>;
  presets?: WorldPreset[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editingLabel = editing?.kind === "novel" ? "小说" : "剧本";

  return (
    <Sheet
      open={Boolean(editing)}
      onOpenChange={(open) => {
        if (!open) setEditing(null);
      }}
    >
      <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>
            {editing?.derived ? "从模板派生" : "创建作品"}
          </SheetTitle>
          <SheetDescription>
            小说和剧本的设定项不同。切换后填写对应内容，确认后进入作品。
          </SheetDescription>
        </SheetHeader>
        {editing ? (
          <>
            <div className="shrink-0 px-5 pt-3">
              <Tabs
                value={editing.kind}
                onValueChange={(kind) => {
                  if (kind !== "script" && kind !== "novel") return;
                  setEditing((current) =>
                    current ? { ...current, kind } : current,
                  );
                }}
              >
                <TabsList aria-label="作品类型">
                  <TabsTrigger type="button" value="script">
                    剧本
                  </TabsTrigger>
                  <TabsTrigger type="button" value="novel">
                    小说
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <WorldEditor
              initial={editing.config}
              kind={editing.kind}
              submitLabel={editing.derived ? "确认派生" : `创建${editingLabel}`}
              presets={presets}
              onPresetSaved={() => {
                void queryClient.invalidateQueries({
                  queryKey: ["world-presets"],
                });
              }}
              onCancel={() => setEditing(null)}
              onSave={async (config) => {
                const result = await worldRequest<{ room: WorldRoom }>(
                  "rooms",
                  "POST",
                  {
                    ...config,
                    kind: editing.kind,
                    ...(editing.sourceTemplateId
                      ? { sourceTemplateId: editing.sourceTemplateId }
                      : {}),
                  },
                );
                void queryClient.invalidateQueries({
                  queryKey: ["world-rooms"],
                });
                router.push(`/agent/worlds/${result.room.id}`);
              }}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
