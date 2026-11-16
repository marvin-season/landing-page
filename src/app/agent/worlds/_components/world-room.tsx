"use client";

import { AiInput, type AiMentionItem } from "@landing-page/biz-ui";
import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
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
import { type ReactNode, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText, worldRequest } from "@/lib/group-chat/client";
import type {
  Character,
  WorldConfig,
  WorldMessage,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import { CharacterAvatar } from "./character-avatar";
import { useWorldRoom } from "./use-world-room";
import { WorldEditor } from "./world-editor";

function NoteCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-b border-border py-3">
      {title ? (
        <h3 className="text-xs tracking-wide text-muted-foreground">{title}</h3>
      ) : null}
      {children}
    </section>
  );
}

function WorldNotes({
  room,
  onMention,
}: {
  room: WorldRoom;
  onMention: (id: string) => void;
}) {
  return (
    <div className="flex flex-col text-sm">
      <h3 className="mb-1">登场</h3>
      <NoteCard>
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center text-xs text-muted-foreground">
            系
          </span>
          <p className="min-w-0 flex-1 truncate font-medium">系统 · 你</p>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {room.config.storyGoal ||
            "默认以系统身份干预。输入框上方可以改成旁白或任意角色。"}
        </p>
      </NoteCard>
      {room.config.narration ? (
        <NoteCard>
          <p className="font-medium">旁白</p>
          <p className="text-xs leading-5 text-muted-foreground">
            只负责场景和事件。对话角色不在自己的发言里写旁白。
          </p>
        </NoteCard>
      ) : null}
      {room.config.characters.map((c) => (
        <NoteCard key={c.id}>
          <div className="flex items-center gap-2">
            <CharacterAvatar
              id={c.id}
              name={c.name}
              avatar={c.avatar}
              size="md"
            />
            <p className="min-w-0 flex-1 truncate font-medium">
              {c.name}
              {c.enabled ? "" : " · 已禁用"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2"
              disabled={!c.enabled || room.status === "ended"}
              onClick={() => onMention(c.id)}
            >
              点名
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {c.identity}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {c.publicInfo || c.personality}
          </p>
        </NoteCard>
      ))}
      <NoteCard title="背景故事">
        <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {room.config.background}
        </p>
      </NoteCard>
      <NoteCard title="当前场景">
        <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {room.config.scene}
        </p>
      </NoteCard>
      {room.config.facts ? (
        <NoteCard title="已确认事实">
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {room.config.facts}
          </p>
        </NoteCard>
      ) : null}
      {room.summary ? (
        <NoteCard title="剧情摘要">
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {room.summary.text}
          </p>
        </NoteCard>
      ) : null}
      <NoteCard title="世界规则">
        <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {room.config.rules || "NPC 自主行动，按当前需求持续推进。"}
        </p>
      </NoteCard>
      {room.run ? (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
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

function isUnfinishedReply(message: WorldMessage) {
  return (
    message.kind !== "system" &&
    message.status !== "complete" &&
    message.status !== "streaming"
  );
}

function transcriptRows(messages: WorldMessage[]) {
  const unfinished = messages.filter(isUnfinishedReply);
  const visible = new Set(unfinished.slice(-2).map((message) => message.id));
  type Row =
    | { type: "message"; message: WorldMessage }
    | { type: "folded"; id: string; messages: WorldMessage[] };
  const rows: Row[] = [];
  let folded: WorldMessage[] = [];
  const flush = () => {
    if (!folded.length) return;
    rows.push({ type: "folded", id: folded[0]!.id, messages: folded });
    folded = [];
  };
  for (const message of messages) {
    if (
      unfinished.length > 2 &&
      isUnfinishedReply(message) &&
      !visible.has(message.id)
    ) {
      folded.push(message);
      continue;
    }
    flush();
    rows.push({ type: "message", message });
  }
  flush();
  return rows;
}

function MessageBubble({
  message,
  characters,
  onRetry,
}: {
  message: WorldMessage;
  characters: Character[];
  onRetry?: () => void;
}) {
  if (message.kind === "system") return <p>{message.text}</p>;
  const user = message.kind === "intervention";
  const narrator = message.kind === "narrator";
  const displayName = narrator ? "旁白" : message.name;
  const missingMentions = message.mentions
    .map(
      (id) =>
        `@${characters.find((character) => character.id === id)?.name ?? id}`,
    )
    .filter((name) => !message.text.includes(name));
  const text = [...missingMentions, message.text].filter(Boolean).join(" ");
  const unfinished = isUnfinishedReply(message);
  const character = characters.find((item) => item.id === message.speakerId);
  const role = narrator
    ? message.operator
      ? "你"
      : "场景"
    : user
      ? "系统指令"
      : message.operator
        ? "你"
        : (character?.identity ?? "NPC");
  return (
    <article
      className={cn(
        "flex items-start gap-3 border-b border-border py-4",
        unfinished && "opacity-60",
      )}
    >
      {narrator ? null : character ? (
        <CharacterAvatar
          id={character.id}
          name={character.name}
          avatar={character.avatar}
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center text-xs text-muted-foreground">
          {displayName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{displayName}</span>
          <span className="min-w-0 max-w-48 truncate">{role}</span>
          <time className="ml-auto shrink-0 tabular-nums">
            {new Date(message.createdAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
        <div className="mt-1.5 text-sm leading-7">
          {text ? (
            <UnifiedMarkdown
              content={text}
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

function UnfinishedReplyStack({
  messages,
  characters,
  onRetry,
}: {
  messages: WorldMessage[];
  characters: Character[];
  onRetry: (message: WorldMessage) => (() => void) | undefined;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group/collapsible-trigger flex w-full cursor-pointer items-center gap-2 border-b border-border py-3 text-left text-xs text-muted-foreground">
        <CollapsibleChevron />
        <span>
          {messages.length > 1
            ? `${messages.length} 条未完成回复 · 不计入后续剧情`
            : "未完成 · 不计入后续剧情"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            characters={characters}
            onRetry={onRetry(message)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function inputPlaceholder(speaker: string, label: string) {
  if (speaker === "narrator")
    return "写下旁白，例如：雨停了，控制室里只剩对讲机的电流声。";
  if (speaker === "system")
    return "输入系统干预，例如：让暴雨停下来，大家开始调查停电原因。";
  return `以${label}的身份说一句话。`;
}

function inputHint(
  speaker: string,
  label: string,
  paused: boolean,
  mentionCount: number,
) {
  if (paused && mentionCount)
    return "提交点名后立即继续，指定 NPC 优先行动，随后自动推进。";
  if (paused)
    return speaker === "system"
      ? "当前已暂停，提交只保存指令；继续后生效。"
      : "当前已暂停，提交只保存这一条；继续后生效。";
  if (speaker === "narrator")
    return "这段会直接写成旁白，随后由角色接话。@ 仍可指定接下来谁先说。";
  if (speaker !== "system")
    return `这段会作为${label}已经说出的对白，其他角色接着回应。`;
  return "指令会中止当前生成并调整后续剧情 · @ 可指定 NPC 优先行动";
}

function InputSpeakerSelect({
  value,
  characters,
  onChange,
}: {
  value: string;
  characters: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">输入身份</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          size="sm"
          aria-label="输入身份"
          className="h-6 gap-1 px-2 py-0 text-xs data-[size=sm]:h-6 [&_svg]:size-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system" className="py-1 text-xs">
            系统
          </SelectItem>
          <SelectItem value="narrator" className="py-1 text-xs">
            旁白
          </SelectItem>
          <SelectSeparator />
          {characters.map((item) => (
            <SelectItem key={item.id} value={item.id} className="py-1 text-xs">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WorldRoomView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<AiMentionItem[]>([]);
  const [speakerId, setSpeakerId] = useState("system");
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
      <div className="flex min-h-full flex-col items-center justify-center gap-5 p-8 text-foreground">
        <BookOpen className="size-8 text-muted-foreground" />
        <p>{chat.error || "正在打开世界…"}</p>
        <Button asChild variant="outline">
          <Link href="/agent/worlds">返回世界列表</Link>
        </Button>
      </div>
    );
  const running = chat.stopping || chat.busy || room.run?.status === "running";
  const ended = room.status === "ended";
  const mentionItems = room.config.characters
    .filter((c) => c.enabled)
    .map((c) => ({
      id: c.id,
      label: c.name,
      description: c.identity,
      icon: (
        <CharacterAvatar id={c.id} name={c.name} avatar={c.avatar} size="sm" />
      ),
    }));
  const speaker =
    speakerId === "narrator" ||
    mentionItems.some((item) => item.id === speakerId)
      ? speakerId
      : "system";
  const speakingCharacter = mentionItems.find((item) => item.id === speaker);
  const speakerLabel =
    speaker === "system"
      ? "系统"
      : speaker === "narrator"
        ? "旁白"
        : (speakingCharacter?.label ?? "系统");
  const latestMessage = room.messages.filter((m) => m.kind !== "system").at(-1);
  function retryFor(message: WorldMessage) {
    if (
      running ||
      ended ||
      message.id !== latestMessage?.id ||
      !["agent", "narrator"].includes(message.kind) ||
      !["interrupted", "failed", "truncated"].includes(message.status) ||
      message.configVersion !== room.version
    )
      return undefined;
    return () =>
      chat.start({
        mode: "retry",
        text: "",
        mentions: [],
        speaker: "system",
        resume: true,
        retryMessageId: message.id,
      });
  }
  function addMention(id: string) {
    const item = mentionItems.find((c) => c.id === id);
    if (item && !mentions.some((mention) => mention.id === id)) {
      setDraft(
        (current) =>
          `${current}${current && !/\s$/.test(current) ? " " : ""}@${item.label} `,
      );
      setMentions((current) =>
        current.some((m) => m.id === id) ? current : [...current, item],
      );
    }
    setNotes(false);
  }
  function send(resume = false) {
    const text = draft.trim();
    if (speaker === "system" ? !text && !mentions.length : !text) return;
    submitted.current = { text: draft, mentions };
    chat.start({
      mode: "auto",
      text: draft,
      mentions: mentions.map((m) => m.id),
      speaker,
      resume: resume || mentions.length > 0 || !room!.paused,
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
  const archiveActions = () => {
    return (
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
              const data = await worldRequest(`rooms/${room.id}/export`);
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
    );
  };
  return (
    <div className="flex h-full min-h-0 flex-col text-foreground">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href="/agent/worlds" aria-label="返回世界列表">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-normal">
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
                    ? room.run?.reason || "已暂停"
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
            <ConversationContent className="mx-auto w-full max-w-6xl gap-0 px-4 py-6 sm:px-6">
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
                <div className="flex flex-col gap-4 border-b border-border py-6">
                  <p>开场</p>
                  <h2 className="font-serif text-2xl font-normal">
                    {room.config.title}
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {room.config.background}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {room.config.scene}
                  </p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    你是系统操作者，所有登场人物都是
                    NPC。故事会自动开始并持续推进，你可以观察，也可以随时输入指令改变事件、角色行动或故事走向。
                  </p>
                </div>
              ) : null}
              {transcriptRows(room.messages).map((row) =>
                row.type === "folded" ? (
                  <UnfinishedReplyStack
                    key={row.id}
                    messages={row.messages}
                    characters={room.config.characters}
                    onRetry={retryFor}
                  />
                ) : (
                  <MessageBubble
                    key={row.message.id}
                    message={row.message}
                    characters={room.config.characters}
                    onRetry={retryFor(row.message)}
                  />
                ),
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <footer className="shrink-0 border-t border-border px-4 py-2 sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
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
                        <Pause size={16} data-icon="inline-start" />
                        {chat.stopping ? "正在暂停…" : "暂停"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={chat.pending || actionPending}
                        onClick={() =>
                          chat.start({
                            mode: "auto",
                            text: "",
                            mentions: [],
                            speaker: "system",
                            resume: true,
                          })
                        }
                      >
                        <Play size={16} data-icon="inline-start" />
                        {room.status === "draft" ? "开始自动推进" : "继续故事"}
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
                          speaker: "system",
                          resume: true,
                        })
                      }
                    >
                      <SkipForward size={16} data-icon="inline-start" />
                      仅下一条
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      NPC 自主推进故事 · 当前输入身份是{speakerLabel}
                    </span>
                  </div>
                  <AiInput
                    className="rounded-2xl p-2 shadow-none"
                    value={draft}
                    onValueChange={setDraft}
                    mentions={mentions}
                    onMentionsChange={setMentions}
                    mentionItems={mentionItems}
                    mentionDisplay="inline"
                    disabled={chat.pending || actionPending}
                    canSubmit={
                      speaker === "system"
                        ? Boolean(draft.trim() || mentions.length)
                        : Boolean(draft.trim())
                    }
                    maxLength={8000}
                    rows={1}
                    onSubmit={() => send()}
                    placeholder={inputPlaceholder(speaker, speakerLabel)}
                    sendLabel={
                      speaker === "system"
                        ? "应用干预"
                        : speaker === "narrator"
                          ? "发送旁白"
                          : "发送"
                    }
                    emptyMentionLabel="没有匹配的角色"
                    removeMentionLabel="取消点名"
                    header={
                      <InputSpeakerSelect
                        value={speaker}
                        characters={mentionItems}
                        onChange={setSpeakerId}
                      />
                    }
                    hint={inputHint(
                      speaker,
                      speakerLabel,
                      room.paused,
                      mentions.length,
                    )}
                    footer={
                      room.paused ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={
                            chat.pending ||
                            (speaker === "system"
                              ? !draft.trim() && !mentions.length
                              : !draft.trim())
                          }
                          onClick={() => send(true)}
                        >
                          {speaker === "system" ? "干预并继续" : "发送并继续"}
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
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border px-4 py-5 xl:block">
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
        <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-border pr-12">
            <SheetTitle>
              {copying ? "复制为新世界" : "世界设定与存档"}
            </SheetTitle>
            <SheetDescription>
              修改设定只影响后续对话。秘密仅提供给对应角色。
            </SheetDescription>
          </SheetHeader>
          {editing && (!ended || copying) ? (
            <>
              {!copying ? (
                <div className="shrink-0 border-b border-border px-5 py-3">
                  {archiveActions()}
                </div>
              ) : null}
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
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {archiveActions()}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
