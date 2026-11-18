"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { legacyNovelRoomIds, migrateLegacyNovel } from "./novel/storage";
import { WorldCard, WorldCardFooter, WorldGrid } from "./world-card";
import { WorldEditor } from "./world-editor";

export function WorldLobby({
  kind,
  templates,
}: {
  kind: WorldKind;
  templates: WorldTemplate[];
}) {
  const novel = kind === "novel";
  const label = novel ? "小说" : "剧本";
  const defaultConfig =
    templates.find((template) => template.id === "fog-harbor")?.config ??
    templates[0]?.config;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<WorldConfig | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rooms = useQuery({
    queryKey: ["world-rooms"],
    queryFn: () => worldRequest<{ rooms: RoomListItem[] }>("rooms"),
  });
  const presets = useQuery({
    queryKey: ["world-presets"],
    queryFn: () => worldRequest<{ presets: WorldPreset[] }>("presets"),
  });
  const legacyNovels = useQuery({
    queryKey: ["legacy-world-novels"],
    queryFn: legacyNovelRoomIds,
    enabled: novel,
  });
  const savedRooms = rooms.data?.rooms.filter(
    (room) => (room.kind ?? "script") === kind,
  );
  const legacyRooms = novel
    ? rooms.data?.rooms.filter(
        (room) => room.kind !== "novel" && legacyNovels.data?.includes(room.id),
      )
    : undefined;
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
              {novel ? "导入设定备份" : "导入存档"}
            </Button>
            <Button
              onClick={() => {
                if (defaultConfig) setEditing(structuredClone(defaultConfig));
              }}
            >
              <Plus data-icon="inline-start" />
              创建{label}
            </Button>
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
                if ((backup.kind ?? "script") !== kind)
                  throw new Error(`请选择${label}的备份文件。`);
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
        <nav className="flex items-center gap-2">
          <Button asChild size="sm" variant={novel ? "ghost" : "soft"}>
            <Link
              href="/agent/worlds"
              aria-current={novel ? undefined : "page"}
            >
              <ScrollText data-icon="inline-start" />
              剧本
            </Link>
          </Button>
          <Button asChild size="sm" variant={novel ? "soft" : "ghost"}>
            <Link
              href="/agent/worlds?kind=novel"
              aria-current={novel ? "page" : undefined}
            >
              <BookOpen data-icon="inline-start" />
              小说
            </Link>
          </Button>
        </nav>
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
                    <Button
                      size="sm"
                      variant="text"
                      className="gap-1.5 px-0 h-7"
                      onClick={() => setEditing(structuredClone(world.config))}
                    >
                      使用模板
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </WorldCardFooter>
                </WorldCard>
              ))}
            </WorldGrid>
          </section>
        ) : null}
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground">
              我的{label}
            </h2>
            <span className="text-xs text-muted-foreground">
              {savedRooms?.length ?? 0} 个存档
            </span>
          </div>
          {rooms.isPending ? (
            <p className="py-4 text-sm text-muted-foreground">正在读取存档…</p>
          ) : null}
          {savedRooms?.length === 0 ? (
            <p className="py-4 text-sm leading-5 text-muted-foreground">
              还没有{label}存档。
            </p>
          ) : null}
          <WorldGrid>
            {savedRooms?.map((room) => (
              <WorldCard
                key={room.id}
                onClick={() => router.push(`/agent/worlds/${room.id}`)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5 cursor-pointer">
                    {room.title}
                  </h3>
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
                  {novel ? (
                    <span />
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="size-3.5" />
                      {room.messageCount} 条消息
                    </span>
                  )}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(room.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </WorldCardFooter>
              </WorldCard>
            ))}
          </WorldGrid>
        </section>
        {legacyRooms?.length ? (
          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
              本机旧小说
            </h2>
            <WorldGrid>
              {legacyRooms.map((room) => (
                <WorldCard key={room.id}>
                  <h3 className="text-sm font-medium">{room.title}</h3>
                  <WorldCardFooter>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={async () => {
                        setPending(true);
                        setError("");
                        try {
                          const id = await migrateLegacyNovel(room.id);
                          await Promise.all([
                            queryClient.invalidateQueries({
                              queryKey: ["legacy-world-novels"],
                            }),
                            queryClient.invalidateQueries({
                              queryKey: ["world-rooms"],
                            }),
                          ]);
                          router.push(`/agent/worlds/${id}`);
                        } catch (error) {
                          setError(
                            error instanceof Error
                              ? error.message
                              : "小说迁移失败",
                          );
                        } finally {
                          setPending(false);
                        }
                      }}
                    >
                      迁移为独立小说
                    </Button>
                  </WorldCardFooter>
                </WorldCard>
              ))}
            </WorldGrid>
          </section>
        ) : null}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditing(structuredClone(preset.content))
                        }
                      >
                        使用
                      </Button>
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
            <SheetTitle>创建{label}</SheetTitle>
            <SheetDescription>
              {novel
                ? "设定世界、角色和大纲。"
                : "设定世界、角色和推进要求。创建后自动开始。"}
            </SheetDescription>
          </SheetHeader>
          {editing ? (
            <WorldEditor
              initial={editing}
              kind={kind}
              submitLabel={`创建${label}`}
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
                  { ...config, kind },
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
