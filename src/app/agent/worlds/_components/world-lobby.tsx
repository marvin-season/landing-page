"use client";

import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tag,
} from "@landing-page/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  MessageSquare,
  Plus,
  ScrollText,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactElement, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/shadcn-io/tabs";
import { worldRequest } from "@/lib/group-chat/client";
import {
  backupSchema,
  type RoomListItem,
  type WorldConfig,
  type WorldKind,
  type WorldPreset,
  type WorldRoom,
} from "@/lib/group-chat/model";
import type { WorldTemplate } from "@/lib/group-chat/world-templates";
import { WorldCard, WorldCardFooter, WorldGrid } from "./world-card";
import { WorldEditor } from "./world-editor";

const workFilters = [
  { value: "all", label: "全部" },
  { value: "script", label: "剧本" },
  { value: "novel", label: "小说" },
] as const;
type WorkFilter = (typeof workFilters)[number]["value"];

function WorldKindMenu({
  children,
  onChoose,
}: {
  children: ReactElement;
  onChoose: (kind: WorldKind) => void;
}) {
  const selectedKind = useRef<WorldKind | null>(null);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={() => {
          // Open the editor after the menu gives focus back to its trigger.
          const kind = selectedKind.current;
          selectedKind.current = null;
          if (kind) onChoose(kind);
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              selectedKind.current = "script";
            }}
          >
            <ScrollText />
            剧本
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              selectedKind.current = "novel";
            }}
          >
            <BookOpen />
            小说
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorldLobby({ templates }: { templates: WorldTemplate[] }) {
  const defaultConfig =
    templates.find((template) => template.id === "fog-harbor")?.config ??
    templates[0]?.config;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{
    config: WorldConfig;
    kind: WorldKind;
  } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [workFilter, setWorkFilter] = useState<WorkFilter>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const rooms = useQuery({
    queryKey: ["world-rooms"],
    queryFn: () => worldRequest<{ rooms: RoomListItem[] }>("rooms"),
  });
  const presets = useQuery({
    queryKey: ["world-presets"],
    queryFn: () => worldRequest<{ presets: WorldPreset[] }>("presets"),
  });
  const savedRooms =
    workFilter === "all"
      ? rooms.data?.rooms
      : rooms.data?.rooms.filter((room) => room.kind === workFilter);
  const editingNovel = editing?.kind === "novel";
  const editingLabel = editingNovel ? "小说" : "剧本";
  function startEditing(config: WorldConfig, kind: WorldKind) {
    setEditing({ config: structuredClone(config), kind });
  }
  async function remove(id: string) {
    if (!window.confirm("删除这个世界及其全部存档？此操作不能撤销。")) return;
    setPending(true);
    setError("");
    try {
      await worldRequest(`rooms/${id}`, "DELETE");
      await rooms.refetch();
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
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-normal">开放世界</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              导入存档
            </Button>
            {defaultConfig ? (
              <WorldKindMenu
                onChoose={(kind) => startEditing(defaultConfig, kind)}
              >
                <Button>
                  <Plus data-icon="inline-start" />
                  创建作品
                </Button>
              </WorldKindMenu>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setPending(true);
              setError("");
              try {
                if (file.size > 6 * 1024 * 1024)
                  throw new Error("存档不能超过 6MB");
                const backup = backupSchema.parse(
                  JSON.parse(await file.text()),
                );
                const result = await worldRequest<{ room: WorldRoom }>(
                  "rooms/import",
                  "POST",
                  backup,
                );
                void queryClient.invalidateQueries({
                  queryKey: ["world-rooms"],
                });
                router.push(`/agent/worlds/${result.room.id}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "导入失败");
              } finally {
                setPending(false);
              }
            }}
          />
        </header>
        {error || rooms.error || presets.error ? (
          <Alert className="text-destructive">
            <AlertDescription>
              {error || rooms.error?.message || presets.error?.message}
            </AlertDescription>
          </Alert>
        ) : null}
        {templates.length ? (
          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
              模板
            </h2>
            <WorldGrid>
              {templates.map((world) => (
                <WorldCard key={world.id}>
                  <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5">
                    {world.config.title}
                  </h3>
                  <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {world.details}
                  </p>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {world.description}
                  </p>
                  <WorldCardFooter>
                    <span className="text-xs text-muted-foreground">
                      {world.config.characters.length} 位角色
                    </span>
                    <WorldKindMenu
                      onChoose={(kind) => startEditing(world.config, kind)}
                    >
                      <Button
                        size="sm"
                        variant="text"
                        className="gap-1.5 px-0 h-7"
                      >
                        使用模板
                        <ArrowUpRight className="size-3.5" />
                      </Button>
                    </WorldKindMenu>
                  </WorldCardFooter>
                </WorldCard>
              ))}
            </WorldGrid>
          </section>
        ) : null}
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground">
              我的作品
            </h2>
            <span className="text-xs text-muted-foreground">
              {savedRooms?.length ?? 0} 个存档
            </span>
          </div>
          <Tabs
            value={workFilter}
            onValueChange={setWorkFilter}
            className="mb-3"
          >
            <TabsList aria-label="作品类型">
              {workFilters.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  aria-selected={workFilter === value}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {rooms.isPending ? (
            <p className="py-4 text-sm text-muted-foreground">正在读取存档…</p>
          ) : null}
          {savedRooms?.length === 0 ? (
            <p className="py-4 text-sm leading-5 text-muted-foreground">
              {workFilter === "all"
                ? "还没有作品。"
                : workFilter === "script"
                  ? "还没有剧本。"
                  : "还没有小说。"}
            </p>
          ) : null}
          <WorldGrid>
            {savedRooms?.map((room) => (
              <WorldCard
                key={room.id}
                onClick={() => router.push(`/agent/worlds/${room.id}`)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5 cursor-pointer">
                      {room.title}
                    </h3>
                    <Tag size="compact" className="shrink-0">
                      {room.kind === "novel" ? "小说" : "剧本"}
                    </Tag>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={pending}
                    onClick={(event) => {
                      event.stopPropagation();
                      void remove(room.id);
                    }}
                    aria-label={`删除${room.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
                  <Users />
                  <span className="truncate">{room.characters.join("、")}</span>
                </div>
                <WorldCardFooter>
                  {room.kind === "script" ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="size-3.5" />
                      {room.messageCount} 条消息
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {new Date(room.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </WorldCardFooter>
              </WorldCard>
            ))}
          </WorldGrid>
        </section>
        {presets.data?.presets.length ? (
          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
              我的预设
            </h2>
            <WorldGrid>
              {presets.data.presets.map((preset) => (
                <WorldCard key={preset.id}>
                  <div className="min-w-0 flex-1 w-full">
                    <p className="text-sm font-medium truncate">
                      {preset.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preset.kind === "world"
                        ? "世界预设 · 可在创建面板中选择并编辑"
                        : "角色预设 · 可在角色配置中使用"}
                    </p>
                  </div>
                  <WorldCardFooter>
                    {preset.kind === "world" ? (
                      <WorldKindMenu
                        onChoose={(kind) => startEditing(preset.content, kind)}
                      >
                        <Button size="sm" variant="outline">
                          使用
                        </Button>
                      </WorldKindMenu>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={pending}
                      onClick={async () => {
                        if (!window.confirm("删除这个预设？已有房间不受影响。"))
                          return;
                        setPending(true);
                        try {
                          await worldRequest(`presets/${preset.id}`, "DELETE");
                          await presets.refetch();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "删除失败");
                        } finally {
                          setPending(false);
                        }
                      }}
                      aria-label="删除预设"
                    >
                      <Trash2 />
                    </Button>
                  </WorldCardFooter>
                </WorldCard>
              ))}
            </WorldGrid>
          </section>
        ) : null}
      </div>
      <Sheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-border pr-12">
            <SheetTitle>创建{editingLabel}</SheetTitle>
            <SheetDescription>
              {editingNovel
                ? "设定世界、角色和大纲。"
                : "设定世界、角色和推进要求。创建后自动开始。"}
            </SheetDescription>
          </SheetHeader>
          {editing ? (
            <WorldEditor
              initial={editing.config}
              kind={editing.kind}
              submitLabel={`创建${editingLabel}`}
              presets={presets.data?.presets}
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
                  { ...config, kind: editing.kind },
                );
                void queryClient.invalidateQueries({
                  queryKey: ["world-rooms"],
                });
                router.push(`/agent/worlds/${result.room.id}`);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
