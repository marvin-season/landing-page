"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@landing-page/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { worldRequest } from "@/lib/group-chat/client";
import type {
  RoomListItem,
  WorldConfig,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import type { WorldTemplate } from "@/lib/group-chat/world-templates";
import { WorldEditor } from "./world-editor";

export function WorldLobby({ templates }: { templates: WorldTemplate[] }) {
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
    <div className="min-h-full bg-background px-5 py-8 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-9">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-widest text-muted-foreground">
              WORLD CHAT
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">世界群聊</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              设定世界与推进目标，NPC
              会自主展开故事。你作为系统操作者，随时介入改变走向。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              导入存档
            </Button>
            <Button
              onClick={() => {
                if (defaultConfig) setEditing(structuredClone(defaultConfig));
              }}
            >
              <Plus data-icon="inline-start" />
              创建世界
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
                const result = await worldRequest<{ room: WorldRoom }>(
                  "rooms/import",
                  "POST",
                  JSON.parse(await file.text()),
                );
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
        {templates.map((world) => (
          <section
            key={world.id}
            className="grid gap-6 rounded-3xl border border-border bg-muted/30 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="size-4" />
                一个可以直接开始的世界
              </div>
              <h2 className="text-2xl font-semibold">{world.config.title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {world.description}
              </p>
              <p className="text-xs text-muted-foreground">{world.details}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setEditing(structuredClone(world.config))}
            >
              设定并开始
              <ArrowRight data-icon="inline-end" />
            </Button>
          </section>
        ))}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">我的世界</h2>
            <span className="text-sm text-muted-foreground">
              {rooms.data?.rooms.length ?? 0} 个存档
            </span>
          </div>
          {rooms.isPending ? (
            <p className="py-8 text-sm text-muted-foreground">正在读取存档…</p>
          ) : null}
          {rooms.data?.rooms.length === 0 ? (
            <p className="py-8 text-sm leading-6 text-muted-foreground">
              还没有故事存档。从示例开始，或创建你自己的世界。
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rooms.data?.rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardDescription>
                    {room.status === "ended"
                      ? "已结束"
                      : room.status === "draft"
                        ? "未开始"
                        : room.paused
                          ? "已暂停"
                          : "进行中"}
                  </CardDescription>
                  <CardTitle>{room.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {room.characters.join("、")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {room.messageCount} 条对话 ·{" "}
                    {new Date(room.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/agent/worlds/${room.id}`}>
                      {room.status === "ended" ? "查看故事" : "进入世界"}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => void remove(room.id)}
                    aria-label={`删除${room.title}`}
                  >
                    <Trash2 />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
        {presets.data?.presets.length ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">我的预设</h2>
            {presets.data.presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between gap-4 border-b border-border py-3"
              >
                <div>
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {preset.kind === "world"
                      ? "世界预设 · 可在创建面板中选择并编辑"
                      : "角色预设 · 可在角色配置中使用"}
                  </p>
                </div>
                <div className="flex gap-2">
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
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </div>
      <Sheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>创建你的世界</SheetTitle>
            <SheetDescription>
              设定背景、NPC
              和推进要求。创建并进入世界后自动开始，保存预设不会调用模型。
            </SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-5">
            {editing ? (
              <WorldEditor
                initial={editing}
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
                    config,
                  );
                  void queryClient.invalidateQueries({
                    queryKey: ["world-rooms"],
                  });
                  router.push(`/agent/worlds/${result.room.id}`);
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
