"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Tag,
} from "@landing-page/design-system";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldPreset } from "@/lib/group-chat/model";
import type { WorldTemplate } from "@/lib/group-chat/world-template-model";
import {
  type CreateWorkDraft,
  CreateWorkSheet,
  startCreateWork,
} from "./create-work-sheet";
import { WorldCard, WorldCardFooter, WorldGrid } from "./world-card";

export function WorldTemplatesLobby({
  templates,
}: {
  templates: WorldTemplate[];
}) {
  const [editing, setEditing] = useState<CreateWorkDraft | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const presets = useQuery({
    queryKey: ["world-presets"],
    queryFn: () => worldRequest<{ presets: WorldPreset[] }>("presets"),
  });
  const myPresets = presets.data?.presets ?? [];

  async function removePreset(id: string) {
    if (!window.confirm("删除这个预设？已有房间不受影响。")) return;
    setPending(true);
    setError("");
    try {
      await worldRequest(`presets/${id}`, "DELETE");
      await presets.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setPending(false);
    }
  }

  function openFromTemplate(template: WorldTemplate) {
    setEditing(
      startCreateWork(template.config, {
        derived: true,
        kind: template.kind,
        sourceTemplateId: template.id,
      }),
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {error || presets.error ? (
          <Alert className="text-destructive">
            <AlertDescription>
              {error || presets.error?.message}
            </AlertDescription>
          </Alert>
        ) : null}
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground">
              预设模板
            </h2>
            <span className="text-xs text-muted-foreground">
              {templates.length} 个模板
            </span>
          </div>
          {templates.length ? (
            <WorldGrid>
              {templates.map((world) => (
                <TemplateCard
                  key={world.id}
                  title={world.config.title}
                  kind={world.kind}
                  details={world.details}
                  description={world.description}
                  characterCount={world.config.characters.length}
                  onUse={() => openFromTemplate(world)}
                />
              ))}
            </WorldGrid>
          ) : (
            <p className="py-4 text-sm leading-5 text-muted-foreground">
              还没有预设模板。
            </p>
          )}
        </section>
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground">
              我的预设
            </h2>
            <span className="text-xs text-muted-foreground">
              {myPresets.length} 个预设
            </span>
          </div>
          {presets.isPending ? (
            <p className="py-2 text-sm text-muted-foreground">正在读取预设…</p>
          ) : null}
          {!presets.isPending && !myPresets.length ? (
            <p className="py-4 text-sm leading-5 text-muted-foreground">
              还没有世界 / 角色预设。可在创建或编辑作品时保存。
            </p>
          ) : null}
          {myPresets.length ? (
            <WorldGrid>
              {myPresets.map((preset) =>
                preset.kind === "world" ? (
                  <TemplateCard
                    key={preset.id}
                    title={preset.name}
                    tag="世界"
                    details={preset.content.title}
                    description={preset.content.scene}
                    characterCount={preset.content.characters.length}
                    onUse={() => setEditing(startCreateWork(preset.content))}
                    useLabel="使用预设"
                    actions={
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => void removePreset(preset.id)}
                        aria-label="删除预设"
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                ) : (
                  <TemplateCard
                    key={preset.id}
                    title={preset.name}
                    tag="角色"
                    details={preset.content.identity}
                    description={preset.content.personality}
                    meta="角色预设 · 可在角色配置中使用"
                    actions={
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => void removePreset(preset.id)}
                        aria-label="删除预设"
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                ),
              )}
            </WorldGrid>
          ) : null}
        </section>
      </div>
      <CreateWorkSheet
        editing={editing}
        setEditing={setEditing}
        presets={presets.data?.presets}
      />
    </>
  );
}

function TemplateCard({
  title,
  kind,
  tag,
  details,
  description,
  characterCount,
  meta,
  onUse,
  useLabel = "使用模板",
  actions,
}: {
  title: string;
  kind?: WorldTemplate["kind"];
  tag?: string;
  details: string;
  description: string;
  characterCount?: number;
  meta?: string;
  onUse?: () => void;
  useLabel?: string;
  actions?: ReactNode;
}) {
  const label =
    tag ?? (kind === "novel" ? "小说" : kind === "script" ? "剧本" : undefined);
  return (
    <WorldCard>
      <div className="flex w-full items-start justify-between gap-2">
        <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5">
          {title}
        </h3>
        {label ? (
          <Tag size="compact" className="shrink-0">
            {label}
          </Tag>
        ) : null}
      </div>
      <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
        {details}
      </p>
      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      <WorldCardFooter>
        <span className="text-xs text-muted-foreground">
          {meta ?? (characterCount != null ? `${characterCount} 位角色` : null)}
        </span>
        <div className="flex items-center gap-1">
          {onUse ? (
            <Button
              size="sm"
              variant="text"
              className="gap-1.5 px-0 h-7"
              onClick={onUse}
            >
              {useLabel}
              <ArrowUpRight className="size-3.5" />
            </Button>
          ) : null}
          {actions}
        </div>
      </WorldCardFooter>
    </WorldCard>
  );
}
