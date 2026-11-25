"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Tag,
} from "@landing-page/design-system";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/shadcn-io/tabs";
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldPreset } from "@/lib/group-chat/model";
import type { WorldTemplate } from "@/lib/group-chat/world-template-model";
import {
  type CreateWorkDraft,
  CreateWorkSheet,
  startCreateWork,
} from "./create-work-sheet";
import { WorldCard, WorldCardFooter, WorldGrid } from "./world-card";
import { WorldLobbyNav } from "./world-lobby-nav";

const templateFilters = [
  { value: "mine", label: "我的" },
  { value: "builtin", label: "内置" },
] as const;
type TemplateFilter = (typeof templateFilters)[number]["value"];

export function WorldTemplatesLobby({
  templates,
}: {
  templates: WorldTemplate[];
}) {
  const [editing, setEditing] = useState<CreateWorkDraft | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<TemplateFilter>("mine");
  const presets = useQuery({
    queryKey: ["world-presets"],
    queryFn: () => worldRequest<{ presets: WorldPreset[] }>("presets"),
  });

  const builtinTemplates = useMemo(
    () => templates.filter((template) => template.source === "builtin"),
    [templates],
  );
  const localTemplates = useMemo(
    () => templates.filter((template) => template.source === "local"),
    [templates],
  );
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

  return (
    <div className="min-h-full px-5 py-6 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 @container">
        <header className="flex flex-col gap-3 border-b border-border pb-4 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h1 className="font-serif text-2xl font-normal">开放世界</h1>
            <WorldLobbyNav />
          </div>
        </header>
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
          </div>
          <Tabs value={filter} onValueChange={setFilter} className="mb-3">
            <TabsList aria-label="模板来源">
              {templateFilters.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  aria-selected={filter === value}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {filter === "mine" ? (
            <MineTemplates
              templates={localTemplates}
              presets={myPresets}
              presetsPending={presets.isPending}
              pending={pending}
              onUseTemplate={(template) =>
                setEditing(
                  startCreateWork(template.config, {
                    derived: true,
                    kind: template.kind,
                    sourceTemplateId: template.id,
                  }),
                )
              }
              onUsePreset={(preset) =>
                setEditing(startCreateWork(preset.content))
              }
              onRemovePreset={removePreset}
            />
          ) : (
            <BuiltinTemplates
              templates={builtinTemplates}
              onUseTemplate={(template) =>
                setEditing(
                  startCreateWork(template.config, {
                    derived: true,
                    kind: template.kind,
                    sourceTemplateId: template.id,
                  }),
                )
              }
            />
          )}
        </section>
      </div>
      <CreateWorkSheet
        editing={editing}
        setEditing={setEditing}
        presets={presets.data?.presets}
      />
    </div>
  );
}

function BuiltinTemplates({
  templates,
  onUseTemplate,
}: {
  templates: WorldTemplate[];
  onUseTemplate: (template: WorldTemplate) => void;
}) {
  if (!templates.length) {
    return (
      <p className="py-4 text-sm leading-5 text-muted-foreground">
        还没有内置模板。
      </p>
    );
  }
  return (
    <WorldGrid>
      {templates.map((world) => (
        <TemplateCard
          key={world.id}
          title={world.config.title}
          kind={world.kind}
          details={world.details}
          description={world.description}
          characterCount={world.config.characters.length}
          onUse={() => onUseTemplate(world)}
        />
      ))}
    </WorldGrid>
  );
}

function MineTemplates({
  templates,
  presets,
  presetsPending,
  pending,
  onUseTemplate,
  onUsePreset,
  onRemovePreset,
}: {
  templates: WorldTemplate[];
  presets: WorldPreset[];
  presetsPending: boolean;
  pending: boolean;
  onUseTemplate: (template: WorldTemplate) => void;
  onUsePreset: (preset: Extract<WorldPreset, { kind: "world" }>) => void;
  onRemovePreset: (id: string) => void;
}) {
  const empty = !templates.length && !presets.length && !presetsPending;
  if (empty) {
    return (
      <p className="py-4 text-sm leading-5 text-muted-foreground">
        还没有我的模板或预设。可在创建或编辑作品时保存为世界 / 角色预设。
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {templates.length ? (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
            本地模板
          </h3>
          <WorldGrid>
            {templates.map((world) => (
              <TemplateCard
                key={world.id}
                title={world.config.title}
                kind={world.kind}
                details={world.details}
                description={world.description}
                characterCount={world.config.characters.length}
                onUse={() => onUseTemplate(world)}
              />
            ))}
          </WorldGrid>
        </div>
      ) : null}
      {presetsPending ? (
        <p className="py-2 text-sm text-muted-foreground">正在读取预设…</p>
      ) : null}
      {presets.length ? (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
            我的预设
          </h3>
          <WorldGrid>
            {presets.map((preset) => (
              <WorldCard key={preset.id}>
                <div className="min-w-0 flex-1 w-full">
                  <p className="text-sm font-medium truncate">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {preset.kind === "world"
                      ? "世界预设 · 可在创建面板中选择并编辑"
                      : "角色预设 · 可在角色配置中使用"}
                  </p>
                </div>
                <WorldCardFooter>
                  {preset.kind === "world" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUsePreset(preset)}
                    >
                      使用
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => void onRemovePreset(preset.id)}
                    aria-label="删除预设"
                  >
                    <Trash2 />
                  </Button>
                </WorldCardFooter>
              </WorldCard>
            ))}
          </WorldGrid>
        </div>
      ) : null}
    </div>
  );
}

function TemplateCard({
  title,
  kind,
  details,
  description,
  characterCount,
  onUse,
}: {
  title: string;
  kind: WorldTemplate["kind"];
  details: string;
  description: string;
  characterCount: number;
  onUse: () => void;
}) {
  return (
    <WorldCard>
      <div className="flex w-full items-start justify-between gap-2">
        <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5">
          {title}
        </h3>
        <Tag size="compact" className="shrink-0">
          {kind === "novel" ? "小说" : "剧本"}
        </Tag>
      </div>
      <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
        {details}
      </p>
      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      <WorldCardFooter>
        <span className="text-xs text-muted-foreground">
          {characterCount} 位角色
        </span>
        <Button
          size="sm"
          variant="text"
          className="gap-1.5 px-0 h-7"
          onClick={onUse}
        >
          使用模板
          <ArrowUpRight className="size-3.5" />
        </Button>
      </WorldCardFooter>
    </WorldCard>
  );
}
