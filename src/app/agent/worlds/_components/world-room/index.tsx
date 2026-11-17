"use client";

import type { AiMentionItem } from "@landing-page/biz-ui";
import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { worldRequest } from "@/lib/group-chat/client";
import type {
  WorldConfig,
  WorldMessage,
  WorldPreset,
  WorldRoom,
} from "@/lib/group-chat/model";
import { CharacterAvatar } from "../character-avatar";
import { NovelPanel } from "../novel/novel-panel";
import { useWorldRoom } from "../use-world-room";
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
  const [editing, setEditing] = useState<WorldConfig | null>(null);
  const [copying, setCopying] = useState(false);
  const [presets, setPresets] = useState<WorldPreset[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [novelMode, setNovelMode] = useState(false);
  const [modeReady, setModeReady] = useState(false);
  const [novelBusy, setNovelBusy] = useState(false);
  useEffect(() => {
    try {
      setNovelMode(
        localStorage.getItem(`world-novel-mode:${roomId}`) === "true",
      );
    } catch {
      /* Mode remains available when browser storage is restricted. */
    }
    setModeReady(true);
  }, [roomId]);
  const submitted = useRef<{ text: string; mentions: AiMentionItem[] } | null>(
    null,
  );
  const chat = useWorldRoom(
    roomId,
    () => {
      if (submitted.current) {
        const saved = submitted.current;
        setDraft((value) => (value === saved.text ? "" : value));
        setMentions((value) => (value === saved.mentions ? [] : value));
        submitted.current = null;
      }
    },
    modeReady && !novelMode,
  );
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
  const loaded = room;
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
    <div className="flex h-full min-h-0 flex-col text-foreground">
      <RoomHeader
        title={loaded.config.title}
        running={running || novelBusy}
        ended={ended}
        phase={
          novelBusy ? "正在创作章节…" : chat.phase || loaded.run?.phase || ""
        }
        paused={loaded.paused}
        reason={novelMode ? "小说模式 · 单智能体创作" : loaded.run?.reason}
        actionPending={actionPending}
        onOpenNotes={() => setNotes(true)}
        onEdit={() => void edit()}
        novelMode={novelMode}
        modeDisabled={!modeReady || novelBusy || actionPending || chat.stopping}
        onNovelModeChange={(enabled) => {
          void action(async () => {
            if (running) {
              await chat.stop();
              const result = await worldRequest<{ room: WorldRoom }>(
                `rooms/${roomId}`,
              );
              if (result.room.run?.status === "running")
                throw new Error("群聊尚未暂停，请稍后再切换模式。");
            }
            setNovelMode(enabled);
            try {
              localStorage.setItem(
                `world-novel-mode:${roomId}`,
                String(enabled),
              );
            } catch {
              chat.setError("模式已切换，但浏览器未能保存模式偏好。");
            }
          });
        }}
      />
      {novelMode && chat.error ? (
        <Alert>
          <AlertDescription>{chat.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {novelMode ? (
            <NovelPanel key={room.id} room={room} onBusyChange={setNovelBusy} />
          ) : (
            <>
              <RoomTranscript
                room={room}
                onLoadEarlier={() => void chat.loadEarlier()}
                onRetry={retryFor}
              />
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
            </>
          )}
        </div>
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border px-4 py-5 xl:block">
          <WorldNotes room={room} onMention={addMention} />
        </aside>
      </div>
      <WorldNotesSheet
        open={notes}
        room={room}
        onOpenChange={setNotes}
        onMention={addMention}
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
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
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
              `rooms/${loaded.id}`,
              "PATCH",
              {
                action: "configure",
                expectedVersion: loaded.version,
                config,
              },
            );
            chat.setRoom(data.room);
          }
          setEditing(null);
        }}
      />
    </div>
  );
}
