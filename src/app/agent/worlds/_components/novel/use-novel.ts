"use client";

import {
  aiSdkChatStreamAdapter,
  getChatStreamText,
  initialChatStreamState,
  reduceChatStreamState,
  useChatStreamCore,
} from "@landing-page/utils/stream";
import Dexie, { type Table } from "dexie";
import { useEffect, useRef, useState } from "react";
import type { WorldConfig, WorldRoom } from "@/lib/group-chat/model";
import {
  chapterPrompt,
  createBackground,
  createNovel,
  type Novel,
  type NovelBackground,
  novelRequest,
  summaryPrompt,
} from "./model";

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
const novels: Table<{ key: string; novel: Novel }, string> = db.table("novels");

export function useNovel(
  room: WorldRoom,
  onBusyChange: (busy: boolean) => void,
  onBackgroundReady: (background: NovelBackground) => void,
) {
  const key = `${room.ownerId}:${room.id}`;
  const [novel, setNovel] = useState(() => createNovel(room.config));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [task, setTask] = useState<"chapter" | "summary">("chapter");
  const [backgroundExport, setBackgroundExport] =
    useState<NovelBackground | null>(null);
  const input = useRef<{
    task: "chapter" | "summary";
    config: WorldConfig;
    novel: Novel;
  } | null>(null);
  const state = useRef(initialChatStreamState);
  const finished = useRef(false);
  const generating = useRef(false);
  const chapterTitle = useRef("");
  const latest = useRef(novel);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    novels
      .get(key)
      .then((saved) => {
        if (!active) return;
        if (saved) {
          latest.current = saved.novel;
          setNovel(saved.novel);
        }
        setReady(true);
      })
      .catch(() => {
        if (active)
          setError("无法读取本机小说存档，请检查浏览器存储权限后刷新。");
      });
    return () => {
      active = false;
    };
  }, [key]);

  function update(next: Novel) {
    setBackgroundExport(null);
    latest.current = next;
    setNovel(next);
    setSaving(true);
    writes.current = writes.current
      .then(async () => {
        await novels.put({ key, novel: next });
        if (latest.current === next) setSaving(false);
      })
      .catch(() => {
        setSaving(false);
        setError("小说未能保存到本机，请先导出章节，避免刷新后丢失。");
      });
  }
  function end() {
    generating.current = false;
    setBusy(false);
    onBusyChange(false);
  }
  const stream = useChatStreamCore({
    adapter: aiSdkChatStreamAdapter,
    onEvent(event) {
      if (event.type === "finish") {
        if (event.finishReason && event.finishReason !== "stop")
          throw new Error(
            "本次输出未完整生成，请缩减内容后重试。草稿未计入正文或导出文件。",
          );
        finished.current = true;
      }
      state.current = reduceChatStreamState(state.current, event);
      setPreview(getChatStreamText(state.current));
    },
    onComplete() {
      end();
      const text = getChatStreamText(state.current).trim();
      if (!finished.current || !text) {
        setError(
          "连接提前结束或没有生成内容，请重试。草稿未计入正文或导出文件。",
        );
        return;
      }
      const captured = input.current;
      if (!captured) return;
      if (captured.task === "summary") {
        try {
          const background = createBackground(
            captured.config,
            captured.novel,
            text,
          );
          setBackgroundExport(background);
          setPreview("");
          onBackgroundReady(background);
        } catch {
          setError(
            "总结导出失败；若总结过长请缩减后重试，若下载失败可点击再次导出。",
          );
        }
        return;
      }
      update({
        ...latest.current,
        chapters: [
          ...latest.current.chapters,
          {
            id: crypto.randomUUID(),
            title: chapterTitle.current,
            text,
          },
        ],
      });
      setPreview("");
    },
    onError(message) {
      end();
      setError(message);
    },
  });

  function generate(task: "chapter" | "summary" = "chapter") {
    if (!ready || generating.current) return;
    setError("");
    if (task === "summary" && !latest.current.chapters.length) {
      setError("请先完成至少一章，再总结导出背景。");
      return;
    }
    const prompt =
      task === "summary"
        ? summaryPrompt(room.config, latest.current)
        : chapterPrompt(room.config, latest.current);
    // Keep all previous chapters intact rather than silently dropping continuity.
    if (prompt.length > 150000) {
      setError(
        "小说已超出本次完整上下文容量，请导出当前卷并在新世界继续创作。",
      );
      return;
    }
    chapterTitle.current = `第${latest.current.chapters.length + 1}章`;
    input.current = {
      task,
      config: structuredClone(room.config),
      novel: structuredClone(latest.current),
    };
    setTask(task);
    setBackgroundExport(null);
    finished.current = false;
    state.current = initialChatStreamState;
    setPreview("");
    generating.current = true;
    setBusy(true);
    onBusyChange(true);
    stream.send({
      url: "/api/novel",
      body: novelRequest(room.id, prompt, task),
    });
  }

  return {
    novel,
    update,
    ready,
    error,
    saving,
    busy,
    preview,
    task,
    backgroundExport,
    importBackground(background: NovelBackground | undefined) {
      if (!ready || generating.current)
        throw new Error("正在生成或读取小说，请稍后再导入背景。");
      setError("");
      update({ ...latest.current, background });
    },
    generate,
    stop() {
      stream.stop();
      end();
      setError("已停止，本次草稿未计入正文或导出文件，可以重新生成。");
    },
  };
}
