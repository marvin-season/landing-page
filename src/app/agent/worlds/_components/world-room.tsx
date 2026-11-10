"use client";

import { AiInput, type AiMentionItem } from "@landing-page/biz-ui";
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
import { cn } from "@landing-page/utils";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  Flag,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText, worldRequest } from "@/lib/group-chat/client";
import type {
  WorldConfig,
  WorldMessage,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import { useWorldRoom } from "./use-world-room";
import { WorldEditor } from "./world-editor";

function WorldNotes({
  room,
  onMention,
}: {
  room: WorldRoom;
  onMention: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-7 text-sm">
      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Users className="size-4" />
          登场角色
        </h3>
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {room.config.userName.slice(0, 1)}
          </div>
          <div>
            <p className="font-medium">{room.config.userName} · 你</p>
            <p className="text-xs leading-5 text-muted-foreground">
              {room.config.userRole}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <p className="font-medium">系统 · 故事主持人</p>
          <p className="text-xs leading-6 text-muted-foreground">
            叙述场景、推进事件，并根据你的发言安排角色回应，无需点名。
          </p>
        </div>
        {room.config.characters.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-2 rounded-xl border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {c.name}
                  {c.enabled ? "" : " · 已禁用"}
                </p>
                <p className="text-xs text-muted-foreground">{c.identity}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={!c.enabled || room.status === "ended"}
                onClick={() => onMention(c.id)}
              >
                点名
              </Button>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              {c.publicInfo || c.personality}
            </p>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">当前场景</h3>
        <p className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
          {room.config.scene}
        </p>
      </section>
      {room.config.facts ? (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Check className="size-4" />
            已确认事实
          </h3>
          <p className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
            {room.config.facts}
          </p>
        </section>
      ) : null}
      {room.summary ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">剧情摘要</h3>
          <p className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
            {room.summary.text}
          </p>
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">世界规则</h3>
        <p className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
          {room.config.rules || "自由对话，不替用户行动。"}
        </p>
      </section>
      {room.run ? (
        <p className="text-xs leading-5 text-muted-foreground">
          本轮 {room.run.turns}/{room.run.limit} 条发言 · {room.run.calls}{" "}
          次调用
          <br />
          {room.run.usage.reportedCalls
            ? `${room.run.usage.input + room.run.usage.output} tokens（${room.run.usage.reportedCalls}/${room.run.calls} 次调用报告用量，费用未知）`
            : "用量与费用未知"}
        </p>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  onRetry,
}: {
  message: WorldMessage;
  onRetry?: () => void;
}) {
  if (message.kind === "system")
    return (
      <p className="text-center text-xs text-muted-foreground">
        {message.text}
      </p>
    );
  const user = message.kind === "user";
  const unfinished =
    message.status !== "complete" && message.status !== "streaming";
  return (
    <article className={cn("flex gap-3", user && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold",
          user && "bg-primary/10 text-primary",
        )}
      >
        {message.name.slice(0, 1)}
      </div>
      <div className="flex min-w-0 max-w-[88%] flex-col gap-2 sm:max-w-[85%]">
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            user && "justify-end",
          )}
        >
          <span className="font-medium text-foreground">{message.name}</span>
          <span>
            {user ? "你" : message.kind === "narrator" ? "故事主持人" : "角色"}
          </span>
          <time>
            {new Date(message.createdAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
        <div
          className={cn(
            "rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-7",
            user && "border-transparent bg-primary/10",
            unfinished && "opacity-60",
          )}
        >
          {message.text ? (
            <UnifiedMarkdown
              content={message.text}
              hasNextChunk={message.status === "streaming"}
            />
          ) : (
            <span className="text-muted-foreground">
              {message.status === "streaming"
                ? "正在组织语言…"
                : "本次未完成回复"}
            </span>
          )}
        </div>
        {unfinished ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>未完成 · 不计入后续剧情</span>
            {onRetry ? (
              <Button size="sm" variant="ghost" onClick={onRetry}>
                <RotateCcw data-icon="inline-start" />
                重试这一条
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function WorldRoomView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<AiMentionItem[]>([]);
  const [notes, setNotes] = useState(false);
  const [editing, setEditing] = useState<WorldConfig | null>(null);
  const [copying, setCopying] = useState(false);
  const [presets, setPresets] = useState<WorldPreset[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const submitted = useRef<{ text: string; mentions: AiMentionItem[] } | null>(
    null,
  );
  const chat = useWorldRoom(roomId, () => {
    if (submitted.current) {
      const saved = submitted.current;
      setDraft((value) => (value === saved.text ? "" : value));
      setMentions((value) => (value === saved.mentions ? [] : value));
      submitted.current = null;
    }
  });
  const { room } = chat;
  async function action(work: () => Promise<void>) {
    setActionPending(true);
    chat.setError("");
    try {
      await work();
    } catch (e) {
      chat.setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActionPending(false);
    }
  }
  if (!room)
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-background p-8 text-foreground">
        <BookOpen className="size-8 text-muted-foreground" />
        <p>{chat.error || "正在打开世界…"}</p>
        <Button asChild variant="outline">
          <Link href="/agent/worlds">返回世界列表</Link>
        </Button>
      </div>
    );
  const running = chat.stopping || chat.busy || room.run?.status === "running";
  const waitingForDecision = room.paused && room.run?.reason === "等待你的决定";
  const ended = room.status === "ended";
  const mentionItems = room.config.characters
    .filter((c) => c.enabled)
    .map((c) => ({ id: c.id, label: c.name, description: c.identity }));
  const latestMessage = room.messages.filter((m) => m.kind !== "system").at(-1);
  function addMention(id: string) {
    const item = mentionItems.find((c) => c.id === id);
    if (item)
      setMentions((current) =>
        current.some((m) => m.id === id) ? current : [...current, item],
      );
    setNotes(false);
  }
  function send(resume = false) {
    if (!draft.trim() && !mentions.length) return;
    submitted.current = { text: draft, mentions };
    chat.start({
      mode: "auto",
      text: draft,
      mentions: mentions.map((m) => m.id),
      resume: resume || !room!.paused || waitingForDecision,
    });
  }
  async function edit(copy = false) {
    setCopying(copy);
    setEditing(structuredClone(room!.config));
    try {
      setPresets(
        (await worldRequest<{ presets: WorldPreset[] }>("presets")).presets,
      );
    } catch {
      /* Configuration can still be edited without preset discovery. */
    }
  }
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/agent/worlds" aria-label="返回世界列表">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              {room.config.title}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {running ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : null}
              {ended
                ? "故事已结束"
                : running
                  ? chat.phase || room.run?.phase
                  : room.paused
                    ? waitingForDecision
                      ? "等待你的回复"
                      : room.run?.reason || "已暂停"
                    : room.run?.reason || "故事尚未开始"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotes(true)}
            className="xl:hidden"
          >
            <Users data-icon="inline-start" />
            世界
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={running || actionPending}
            onClick={() => void edit()}
          >
            <Settings2 data-icon="inline-start" />
            设定
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Conversation className="min-h-0">
            <ConversationContent className="mx-auto w-full max-w-4xl gap-6 px-4 py-6 sm:px-8">
              {(room.messages[0]?.seq ?? 1) > 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void chat.loadEarlier()}
                >
                  加载更早的对话
                </Button>
              ) : null}
              {!room.messages.length ? (
                <div className="mx-auto flex max-w-lg flex-col gap-5 py-10">
                  <p className="text-xs font-medium tracking-widest text-muted-foreground">
                    故事的起点
                  </p>
                  <h2 className="text-2xl font-semibold">
                    {room.config.title}
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                    {room.config.background}
                  </p>
                  <p className="whitespace-pre-wrap border-l-2 border-primary/30 pl-4 text-sm leading-7">
                    {room.config.scene}
                  </p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    你就是{room.config.userName}
                    ，直接用“我”说话就好，比如“我来帮忙”或“我想先看看”。也可以让系统开启故事，随时暂停或接话，无需
                    @ 点名。
                  </p>
                </div>
              ) : null}
              {room.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onRetry={
                    !running &&
                    !ended &&
                    message.id === latestMessage?.id &&
                    ["agent", "narrator"].includes(message.kind) &&
                    ["interrupted", "failed", "truncated"].includes(
                      message.status,
                    ) &&
                    message.configVersion === room.version
                      ? () =>
                          chat.start({
                            mode: "retry",
                            text: "",
                            mentions: [],
                            resume: true,
                            retryMessageId: message.id,
                          })
                      : undefined
                  }
                />
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <footer className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-4xl flex-col gap-3">
              {chat.error ? (
                <Alert className="text-destructive">
                  <AlertDescription>
                    {chat.error}
                    {chat.retrySubmission && !running ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={chat.retrySubmission}
                      >
                        重试提交
                      </Button>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}
              {!ended ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {running ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={chat.stopping}
                        onClick={() => void chat.stop()}
                      >
                        <Pause data-icon="inline-start" />
                        {chat.stopping ? "正在暂停…" : "暂停"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={chat.pending || actionPending}
                        onClick={() =>
                          chat.start({
                            mode: "auto",
                            text: "",
                            mentions: [],
                            resume: true,
                          })
                        }
                      >
                        <Play data-icon="inline-start" />
                        {room.status === "draft"
                          ? "让系统开启故事"
                          : "继续故事"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={running || chat.pending || actionPending}
                      onClick={() =>
                        chat.start({
                          mode: "step",
                          text: "",
                          mentions: [],
                          resume: true,
                        })
                      }
                    >
                      <SkipForward data-icon="inline-start" />
                      仅下一条
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      系统主持剧情，角色依次回应 · 随时可暂停或插话
                    </span>
                  </div>
                  <AiInput
                    value={draft}
                    onValueChange={setDraft}
                    mentions={mentions}
                    onMentionsChange={setMentions}
                    mentionItems={mentionItems}
                    disabled={chat.pending || actionPending}
                    maxLength={8000}
                    rows={2}
                    onSubmit={() => send()}
                    placeholder="直接说你想说的话，比如：我来帮忙。"
                    sendLabel="发送消息"
                    emptyMentionLabel="没有匹配的角色"
                    removeMentionLabel="取消点名"
                    hint={
                      waitingForDecision
                        ? "回复角色的问题，大家会继续聊下去。"
                        : room.paused
                          ? "当前已暂停，普通发送只保存消息。"
                          : "无需点名，系统自动安排回应 · @ 可指定角色优先发言"
                    }
                    footer={
                      room.paused && !waitingForDecision ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={
                            chat.pending || (!draft.trim() && !mentions.length)
                          }
                          onClick={() => send(true)}
                        >
                          发送并继续
                        </Button>
                      ) : undefined
                    }
                  />
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    故事已结束，存档仍可查看与导出。
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void edit(true)}
                  >
                    <Copy data-icon="inline-start" />
                    复制世界
                  </Button>
                </div>
              )}
            </div>
          </footer>
        </div>
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-5 xl:block">
          <WorldNotes room={room} onMention={addMention} />
        </aside>
      </div>
      <Sheet open={notes} onOpenChange={setNotes}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>世界与角色</SheetTitle>
            <SheetDescription>公开设定与当前剧情</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <WorldNotes room={room} onMention={addMention} />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {copying ? "复制为新世界" : "世界设定与存档"}
            </SheetTitle>
            <SheetDescription>
              修改设定只影响后续对话。秘密仅提供给对应角色。
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-5 pb-5">
            {!copying ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionPending}
                  onClick={() =>
                    void action(async () => {
                      const response = await fetch(
                        `/api/group-chat/rooms/${room.id}/export?format=markdown`,
                      );
                      if (!response.ok) throw new Error("导出失败");
                      downloadText(
                        `${room.config.title}.md`,
                        await response.text(),
                        "text/markdown",
                      );
                    })
                  }
                >
                  <Download data-icon="inline-start" />
                  导出对话
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionPending}
                  onClick={() =>
                    void action(async () => {
                      if (
                        !window.confirm(
                          "完整备份包含所有角色的秘密和私有设定，请妥善保管。是否导出？",
                        )
                      )
                        return;
                      const data = await worldRequest(
                        `rooms/${room.id}/export`,
                      );
                      downloadText(
                        `${room.config.title}.json`,
                        JSON.stringify(data, null, 2),
                      );
                    })
                  }
                >
                  完整备份
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCopying(true);
                    setEditing(structuredClone(room.config));
                  }}
                >
                  <Copy data-icon="inline-start" />
                  复制世界
                </Button>
                {!ended ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={actionPending}
                    onClick={() =>
                      void action(async () => {
                        if (
                          !window.confirm(
                            "结束这个故事？结束后只能查看与导出，也可以复制配置创建新世界。",
                          )
                        )
                          return;
                        const data = await worldRequest<{ room: WorldRoom }>(
                          `rooms/${room.id}`,
                          "PATCH",
                          { action: "end" },
                        );
                        chat.setRoom(data.room);
                        setEditing(null);
                      })
                    }
                  >
                    <Flag data-icon="inline-start" />
                    结束故事
                  </Button>
                ) : null}
              </div>
            ) : null}
            {editing && (!ended || copying) ? (
              <WorldEditor
                key={`${copying}-${room.version}`}
                initial={editing}
                submitLabel={copying ? "创建世界" : "保存设定"}
                lockedMembers={!copying && room.status !== "draft"}
                presets={presets}
                onCancel={() => setEditing(null)}
                onSave={async (config) => {
                  if (copying) {
                    const data = await worldRequest<{ room: WorldRoom }>(
                      "rooms",
                      "POST",
                      config,
                    );
                    router.push(`/agent/worlds/${data.room.id}`);
                  } else {
                    const data = await worldRequest<{ room: WorldRoom }>(
                      `rooms/${room.id}`,
                      "PATCH",
                      {
                        action: "configure",
                        expectedVersion: room.version,
                        config,
                      },
                    );
                    chat.setRoom(data.room);
                  }
                  setEditing(null);
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
