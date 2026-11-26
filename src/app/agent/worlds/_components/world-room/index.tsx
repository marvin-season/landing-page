"use client";

import type { AiMentionItem } from "@landing-page/biz-ui";
import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleContent,
} from "@landing-page/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { confirmAgentNavigation } from "@/app/agent/_components/use-unsaved-navigation";
import { BrandStatusPage } from "@/components/brand-status-page";
import { worldRequest } from "@/lib/group-chat/client";
import type {
  WorldConfig,
  WorldMessage,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import {
  isStandaloneNovelPlaceholder,
  novelSettingsHintKey,
} from "@/lib/group-chat/standalone-novel-config";
import { worldsWorksPath } from "@/lib/worlds-paths";
import { CharacterAvatar } from "../character-avatar";
import { ComposerDock } from "../floating-composer";
import { ChapterPromptReuseProvider } from "../novel/chapter-prompt-reuse";
import type { NovelWritingContext } from "../novel/model";
import { type NovelContextBridge, NovelPanel } from "../novel/novel-panel";
import { NovelThinkingHistoryProvider } from "../novel/thinking-history-context";
import { useWorldRoom } from "../use-world-room";
import { WorldRoomSkeleton } from "../world-room-skeleton";
import { ArchiveActions } from "./archive-actions";
import { RoomComposer } from "./room-composer";
import { RoomHeader } from "./room-header";
import { RoomTranscript } from "./room-transcript";
import { SettingsSheet } from "./settings-sheet";
import { WorldNotes, WorldNotesSheet } from "./world-notes";

export function WorldRoomView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<AiMentionItem[]>([]);
  const [speakerId, setSpeakerId] = useState("system");
  const [notes, setNotes] = useState(false);
  const [notesSidebarOpen, setNotesSidebarOpen] = useState(false);
  const [editing, setEditing] = useState<WorldConfig | null>(null);
  const [copying, setCopying] = useState(false);
  const [presets, setPresets] = useState<WorldPreset[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [novelBusy, setNovelBusy] = useState(false);
  const [novelChapterStatus, setNovelChapterStatus] = useState<{
    count: number;
    saving: boolean;
  } | null>(null);
  const [novelEditing, setNovelEditing] = useState(false);
  const [novelFileToolbar, setNovelFileToolbar] =
    useState<HTMLDivElement | null>(null);
  const [atContentTop, setAtContentTop] = useState(true);
  // Hysteresis so the room header does not snap at scrollTop === 0.
  const onContentScrollTop = useCallback((scrollTop: number) => {
    setAtContentTop((open) => (open ? scrollTop <= 28 : scrollTop <= 4));
  }, []);
  const [novelContext, setNovelContext] = useState<NovelWritingContext | null>(
    null,
  );
  const [novelSettled, setNovelSettled] = useState(false);
  const [settingsHintDismissed, setSettingsHintDismissed] = useState(true);
  const saveNovelContext = useRef<
    ((context: NovelWritingContext) => Promise<boolean>) | null
  >(null);
  const onNovelContext = useCallback((value: NovelContextBridge | null) => {
    saveNovelContext.current = value?.save ?? null;
    setNovelSettled(value?.settled ?? false);
    setNovelContext((current) => {
      const next = value?.context ?? null;
      if (
        current &&
        next &&
        current.title === next.title &&
        current.style === next.style &&
        current.outline === next.outline &&
        (current.skills ?? []).join("\0") === (next.skills ?? []).join("\0")
      )
        return current;
      return next;
    });
  }, []);
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
  useEffect(() => {
    if (!room || room.kind !== "novel") {
      setSettingsHintDismissed(true);
      return;
    }
    if (room.sourceTemplateId || !isStandaloneNovelPlaceholder(room.config)) {
      setSettingsHintDismissed(true);
      return;
    }
    try {
      setSettingsHintDismissed(
        window.localStorage.getItem(novelSettingsHintKey(room.id)) === "1",
      );
    } catch {
      setSettingsHintDismissed(false);
    }
  }, [room]);
  function dismissSettingsHint() {
    if (!room) return;
    setSettingsHintDismissed(true);
    try {
      window.localStorage.setItem(novelSettingsHintKey(room.id), "1");
    } catch {
      /* ignore quota / private mode */
    }
  }
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
  if (!room) {
    if (chat.loadError) {
      return (
        <BrandStatusPage
          className="min-h-full"
          eyebrow="404"
          title="世界不见了"
          description="这个世界不存在、被删了，或当前账号看不到。回列表看看别的吧。"
          detail={<p className="wrap-break-word">{chat.loadError}</p>}
          actions={
            <Button asChild>
              <Link href={worldsWorksPath}>返回我的作品</Link>
            </Button>
          }
        />
      );
    }
    return <WorldRoomSkeleton showHeader />;
  }
  const loaded = room;
  const { kind } = room;
  const novelMode = kind === "novel";
  const running =
    chat.stopping || chat.busy || loaded.run?.status === "running";
  const ended = loaded.status === "ended";
  const mentionItems = loaded.config.characters
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
  const latestMessage = loaded.messages
    .filter((m) => m.kind !== "system")
    .at(-1);
  function retryFor(message: WorldMessage) {
    if (
      running ||
      ended ||
      message.id !== latestMessage?.id ||
      !["agent", "narrator"].includes(message.kind) ||
      !["interrupted", "failed", "truncated"].includes(message.status) ||
      message.configVersion !== loaded.version
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
      resume: resume || mentions.length > 0 || !loaded.paused,
    });
  }
  async function edit(copy = false) {
    setCopying(copy);
    setEditing(structuredClone(loaded.config));
    try {
      setPresets(
        (await worldRequest<{ presets: WorldPreset[] }>("presets")).presets,
      );
    } catch {
      /* Configuration can still be edited without preset discovery. */
    }
  }
  function copyConfig() {
    setCopying(true);
    setEditing(structuredClone(loaded.config));
  }
  return (
    <ChapterPromptReuseProvider>
      <NovelThinkingHistoryProvider>
        <div className="flex h-full min-h-0 flex-col text-foreground">
          {!editing && !(novelMode && novelEditing) ? (
            <Collapsible open={atContentTop} className="shrink-0">
              <CollapsibleContent
                variant="collapse"
                inert={!atContentTop}
                className="duration-340! ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <RoomHeader
                  title={
                    novelMode
                      ? (novelContext?.title ?? loaded.config.title)
                      : loaded.config.title
                  }
                  running={running || novelBusy}
                  ended={ended}
                  phase={
                    novelBusy
                      ? "正在创作章节…"
                      : chat.phase || loaded.run?.phase || ""
                  }
                  paused={loaded.paused}
                  reason={
                    novelMode
                      ? novelChapterStatus
                        ? `已完成 ${novelChapterStatus.count} 章${novelChapterStatus.saving ? " · 正在保存…" : ""}`
                        : "章节创作"
                      : loaded.run?.reason
                  }
                  actionPending={actionPending}
                  onOpenNotes={() => setNotes(true)}
                  notesSidebarOpen={notesSidebarOpen}
                  onToggleNotesSidebar={() =>
                    setNotesSidebarOpen((open) => !open)
                  }
                  onEdit={() => void edit()}
                  fileToolbarRef={novelMode ? setNovelFileToolbar : undefined}
                  showThinkingHistory={novelMode}
                />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
          {novelMode &&
          !editing &&
          !settingsHintDismissed &&
          !room.sourceTemplateId &&
          isStandaloneNovelPlaceholder(loaded.config) ? (
            <Alert className="rounded-none border-x-0 border-t-0">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  当前仍是导入后的默认设定，建议先完善世界与角色，或从正文更新。
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={running || novelBusy || actionPending}
                    onClick={() => void edit()}
                  >
                    去设定
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={dismissSettingsHint}
                  >
                    知道了
                  </Button>
                </span>
              </AlertDescription>
            </Alert>
          ) : null}
          {novelMode && chat.error ? (
            <Alert>
              <AlertDescription>{chat.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {novelMode ? (
                <div className="relative isolate flex min-h-0 flex-1 flex-col">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
                  >
                    {/* <div className="absolute inset-4 scale-70 bg-[url('/images/18/nekocosplay/01-go-play-yeri.webp')] bg-cover bg-top opacity-15 blur-xs" /> */}
                  </div>
                  <NovelPanel
                    key={room.id}
                    room={room}
                    fileToolbar={novelFileToolbar}
                    onBusyChange={setNovelBusy}
                    onEditingChange={setNovelEditing}
                    onScrollTopChange={onContentScrollTop}
                    onChapterStatus={setNovelChapterStatus}
                    onContext={onNovelContext}
                  />
                </div>
              ) : (
                <ComposerDock
                  composer={
                    <RoomComposer
                      draft={draft}
                      mentions={mentions}
                      mentionItems={mentionItems}
                      speaker={speaker}
                      speakerLabel={speakerLabel}
                      paused={loaded.paused}
                      running={running}
                      stopping={chat.stopping}
                      pending={chat.pending}
                      actionPending={actionPending}
                      ended={ended}
                      draftStatus={loaded.status === "draft"}
                      error={chat.error}
                      onRetrySubmission={chat.retrySubmission}
                      onDraftChange={setDraft}
                      onMentionsChange={setMentions}
                      onSpeakerChange={setSpeakerId}
                      onSend={send}
                      onStop={() => void chat.stop()}
                      onContinue={() =>
                        chat.start({
                          mode: "auto",
                          text: "",
                          mentions: [],
                          speaker: "system",
                          resume: true,
                        })
                      }
                      onStep={() =>
                        chat.start({
                          mode: "step",
                          text: "",
                          mentions: [],
                          speaker: "system",
                          resume: true,
                        })
                      }
                      onCopy={() => void edit(true)}
                    />
                  }
                >
                  <RoomTranscript
                    room={room}
                    onScrollTopChange={onContentScrollTop}
                    onLoadEarlier={() => void chat.loadEarlier()}
                    onRetry={retryFor}
                  />
                </ComposerDock>
              )}
            </div>
            {notesSidebarOpen ? (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border px-4 py-5 xl:block">
                <WorldNotes
                  room={room}
                  onMention={novelMode ? undefined : addMention}
                />
              </aside>
            ) : null}
          </div>
          <WorldNotesSheet
            open={notes}
            room={room}
            onOpenChange={setNotes}
            onMention={novelMode ? undefined : addMention}
          />
          <SettingsSheet
            room={room}
            ended={ended}
            editing={editing}
            copying={copying}
            presets={presets}
            archive={
              <ArchiveActions
                room={room}
                ended={ended}
                pending={actionPending}
                onPending={action}
                onCopy={copyConfig}
                onEnded={(next) => {
                  chat.setRoom(next);
                  setEditing(null);
                }}
              />
            }
            includeNovelContext={novelMode && !copying}
            novelContext={novelContext}
            novelContextReady={novelSettled}
            onOpenChange={(open) => {
              if (!open) setEditing(null);
            }}
            onSave={async (config, writingContext) => {
              if (copying) {
                if (!confirmAgentNavigation()) return;
                const data = await worldRequest<{ room: WorldRoom }>(
                  "rooms",
                  "POST",
                  { ...config, kind },
                );
                router.push(`/agent/worlds/${data.room.id}`);
              } else {
                const previousContext = novelContext;
                if (writingContext) {
                  const saved =
                    await saveNovelContext.current?.(writingContext);
                  if (!saved) throw new Error("小说设定未能保存到本机。");
                }
                try {
                  const data = await worldRequest<{ room: WorldRoom }>(
                    `rooms/${loaded.id}`,
                    "PATCH",
                    {
                      action: "configure",
                      expectedVersion: loaded.version,
                      config,
                    },
                  );
                  chat.setRoom(data.room);
                  if (novelMode) dismissSettingsHint();
                } catch (error) {
                  if (writingContext && previousContext) {
                    const restored =
                      await saveNovelContext.current?.(previousContext);
                    if (!restored)
                      throw new Error(
                        "世界设定未保存，本机小说设定也未能恢复。请刷新后核对两处设定。",
                      );
                  }
                  throw error;
                }
              }
              setEditing(null);
            }}
          />
        </div>
      </NovelThinkingHistoryProvider>
    </ChapterPromptReuseProvider>
  );
}
