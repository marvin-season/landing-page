"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Tag,
} from "@landing-page/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, MessageSquare, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/shadcn-io/tabs";
import { worldRequest } from "@/lib/group-chat/client";
import type {
  RoomListItem,
  WorldConfig,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import { standaloneNovelConfig } from "@/lib/group-chat/standalone-novel-config";
import {
  type CreateWorkDraft,
  CreateWorkSheet,
  startCreateWork,
} from "./create-work-sheet";
import { ImportNovelTemplateDialog } from "./import-novel-template-dialog";
import { createImportedNovel, type ImportedNovel } from "./novel/import-novel";
import { createNovel } from "./novel/model";
import { addNovelCopy, observeNovelList } from "./novel/use-novel-storage";
import { WorldCard, WorldCardFooter, WorldGrid } from "./world-card";
import { WorldLobbyHeaderActions } from "./world-lobby-chrome";

const workFilters = [
  { value: "all", label: "全部" },
  { value: "script", label: "剧本" },
  { value: "novel", label: "小说" },
] as const;
type WorkFilter = (typeof workFilters)[number]["value"];

export function WorldLobby({ defaultConfig }: { defaultConfig?: WorldConfig }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CreateWorkDraft | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const actionsDisabled = pending || creatingBlank;
  const [workFilter, setWorkFilter] = useState<WorkFilter>("all");
  const rooms = useQuery({
    queryKey: ["world-rooms"],
    queryFn: () => worldRequest<{ rooms: RoomListItem[] }>("rooms"),
  });
  const presets = useQuery({
    queryKey: ["world-presets"],
    queryFn: () => worldRequest<{ presets: WorldPreset[] }>("presets"),
  });
  const [localNovels, setLocalNovels] = useState<
    ReadonlyMap<string, { title: string; updatedAt?: number }>
  >(() => new Map());
  useEffect(() => {
    const ids = rooms.data?.rooms
      .filter(({ kind }) => kind === "novel")
      .map(({ id }) => id);
    if (!ids?.length) return;
    const subscription = observeNovelList(ids).subscribe({
      next: setLocalNovels,
      error: () => setLocalNovels(new Map()),
    });
    return () => subscription.unsubscribe();
  }, [rooms.data]);
  const savedRooms = useMemo(() => {
    const filtered =
      workFilter === "all"
        ? rooms.data?.rooms
        : rooms.data?.rooms.filter((room) => room.kind === workFilter);
    if (!filtered) return filtered;
    return [...filtered].sort((a, b) => {
      const aTime = Math.max(
        Date.parse(a.updatedAt) || 0,
        localNovels.get(a.id)?.updatedAt ?? 0,
      );
      const bTime = Math.max(
        Date.parse(b.updatedAt) || 0,
        localNovels.get(b.id)?.updatedAt ?? 0,
      );
      return bTime - aTime;
    });
  }, [localNovels, rooms.data?.rooms, workFilter]);

  async function createStandaloneNovel(imported?: ImportedNovel) {
    const config = standaloneNovelConfig(imported?.title ?? "", {
      source: imported ? "import" : "blank",
    });
    const novel = imported
      ? createImportedNovel(config, imported)
      : createNovel(config);
    const { room } = await worldRequest<{ room: WorldRoom }>("rooms", "POST", {
      ...config,
      kind: "novel",
    });
    try {
      await addNovelCopy(`${room.ownerId}:${room.id}`, {
        ...novel,
        updatedAt: Date.now(),
      });
    } catch {
      try {
        await worldRequest(`rooms/${room.id}`, "DELETE");
      } catch {
        void queryClient.invalidateQueries({ queryKey: ["world-rooms"] });
        throw new Error(
          "小说未能保存到本机，空作品也未能清理。请在作品列表删除空作品后重试。",
        );
      }
      throw new Error("小说未能保存到本机。请检查浏览器存储空间后重试。");
    }
    void queryClient.invalidateQueries({ queryKey: ["world-rooms"] });
    router.push(`/agent/worlds/${room.id}`);
  }

  async function createBlankNovel() {
    if (actionsDisabled) return;
    setError("");
    setCreatingBlank(true);
    try {
      await createStandaloneNovel();
    } catch (error) {
      setError(error instanceof Error ? error.message : "创建小说失败");
    } finally {
      setCreatingBlank(false);
    }
  }

  async function remove(room: RoomListItem) {
    const message =
      room.kind === "novel"
        ? "删除这部作品的世界记录后将无法再从作品列表打开小说。请先导出需要保留的正文和草稿。确定删除？"
        : "删除这个世界及其全部存档？此操作不能撤销。";
    if (!window.confirm(message)) return;
    setPending(true);
    setError("");
    try {
      await worldRequest(`rooms/${room.id}`, "DELETE");
      await rooms.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <WorldLobbyHeaderActions>
        <ImportNovelTemplateDialog
          disabled={actionsDisabled}
          onImport={createStandaloneNovel}
        />
        {defaultConfig ? (
          <Button
            disabled={creatingBlank}
            onClick={() => setEditing(startCreateWork(defaultConfig))}
          >
            <Plus data-icon="inline-start" />
            创建作品
          </Button>
        ) : null}
      </WorldLobbyHeaderActions>
      <div className="flex flex-col gap-6">
        {error || rooms.error || presets.error ? (
          <Alert className="text-destructive">
            <AlertDescription>
              {error || rooms.error?.message || presets.error?.message}
            </AlertDescription>
          </Alert>
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
            {workFilter !== "script" ? (
              <WorldCard className="relative min-h-28">
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute inset-0 size-full flex-col gap-2 rounded-lg"
                  disabled={actionsDisabled}
                  onClick={() => void createBlankNovel()}
                >
                  {creatingBlank ? (
                    <LoaderCircle className="size-8 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Plus className="size-8" strokeWidth={1.75} />
                  )}
                  {creatingBlank ? "正在创建…" : "新建空白小说"}
                </Button>
              </WorldCard>
            ) : null}
            {savedRooms?.map((room) => (
              <WorldCard
                key={room.id}
                onClick={() => router.push(`/agent/worlds/${room.id}`)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5 cursor-pointer">
                      {localNovels.get(room.id)?.title || room.title}
                    </h3>
                    <Tag size="compact" className="shrink-0">
                      {room.kind === "novel" ? "小说" : "剧本"}
                    </Tag>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={actionsDisabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      void remove(room);
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
                    {new Date(
                      Math.max(
                        Date.parse(room.updatedAt),
                        localNovels.get(room.id)?.updatedAt ?? 0,
                      ),
                    ).toLocaleDateString("zh-CN")}
                  </span>
                </WorldCardFooter>
              </WorldCard>
            ))}
          </WorldGrid>
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
