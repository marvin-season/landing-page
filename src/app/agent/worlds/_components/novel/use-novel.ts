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
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldConfig, WorldRoom } from "@/lib/group-chat/model";
import type { ChapterTextRange } from "./chapter-text";
import {
  forkFitsBudget,
  forkSummaryPrompt,
  prepareNovelFork,
} from "./fork-model";
import { createImportedNovel, type ImportedNovel } from "./import-novel";
import {
  type Chapter,
  chapterPrompt,
  chapterTitle,
  createBackground,
  createNovel,
  insertChapterBefore,
  insertChapterPrompt,
  invalidateEditedCheckpoint,
  isChapterTargetValid,
  maxChapterLength,
  maxNovelPromptLength,
  maxNovelSummaryLength,
  type Novel,
  type NovelBackground,
  type NovelTask,
  novelRequest,
  replaceChapter,
  replaceChapterText,
  rewritePrompt,
  summaryPrompt,
} from "./model";

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
const novels: Table<{ key: string; novel: Novel }, string> = db.table("novels");

type NovelRun =
  | { task: "chapter"; title: string; beforeId?: never }
  | { task: "chapter"; beforeId: string; title?: never }
  | { task: "summary"; config: WorldConfig; novel: Novel }
  | { task: "summary"; forFork: true }
  | {
      task: "rewrite";
      chapterId: string;
      novel: Novel;
      version: number;
      range?: ChapterTextRange;
      draft?: Chapter;
    };

export function useNovel(
  room: WorldRoom,
  onBusyChange: (busy: boolean) => void,
  onBackgroundReady: (background: NovelBackground) => void,
  onChapterInserted: (id: string) => void,
) {
  const key = `${room.ownerId}:${room.id}`;
  const [novel, setNovel] = useState(() => createNovel(room.config));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [task, setTask] = useState<NovelTask>("chapter");
  const [inserting, setInserting] = useState(false);
  const [rewriteReady, setRewriteReady] = useState(false);
  const [forkSummary, setForkSummary] = useState("");
  const [backgroundExport, setBackgroundExport] =
    useState<NovelBackground | null>(null);
  const input = useRef<NovelRun | null>(null);
  const state = useRef(initialChatStreamState);
  const finished = useRef(false);
  const generating = useRef(false);
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

  function update(next: Novel, { persistFirst = false } = {}) {
    next = invalidateEditedCheckpoint(latest.current, next);
    function publish() {
      setBackgroundExport(null);
      latest.current = next;
      setNovel(next);
    }
    if (!persistFirst) publish();
    setSaving(true);
    const write = writes.current.then(async () => {
      await novels.put({ key, novel: next });
      if (persistFirst) publish();
      if (latest.current === next) setSaving(false);
    });
    writes.current = write.catch(() => {
      setSaving(false);
      setError("小说未能保存到本机，请先导出章节，避免刷新后丢失。");
    });
    return write.then(
      () => true,
      () => false,
    );
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
      if (captured.task === "rewrite") {
        setPreview(text);
        setRewriteReady(true);
        return;
      }
      if (captured.task === "summary") {
        if ("forFork" in captured) {
          if (text.length > maxNovelSummaryLength) {
            setError("摘要超过长度上限，请重新生成或手动输入较短的摘要。");
          } else {
            setForkSummary(text);
          }
          setPreview("");
          return;
        }
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
      if (text.length > maxChapterLength) {
        setError(
          `本章超过 ${maxChapterLength} 字，草稿未保存。请降低目标字数后重试。`,
        );
        return;
      }
      const chapter = { id: crypto.randomUUID(), text };
      const current = latest.current;
      if (captured.beforeId !== undefined) {
        try {
          update(insertChapterBefore(current, captured.beforeId, chapter));
        } catch (error) {
          setError(error instanceof Error ? error.message : "无法插入新章节。");
          return;
        }
        setInserting(false);
        onChapterInserted(chapter.id);
      } else {
        update({
          ...current,
          chapters: [
            ...current.chapters,
            { ...chapter, title: captured.title },
          ],
        });
      }
      setPreview("");
    },
    onError(message) {
      end();
      setError(message);
    },
  });

  function start(run: NovelRun, prompt: string) {
    input.current = run;
    setError("");
    setTask(run.task);
    setInserting(run.task === "chapter" && Boolean(run.beforeId));
    if (run.task !== "rewrite") setBackgroundExport(null);
    setRewriteReady(false);
    finished.current = false;
    state.current = initialChatStreamState;
    setPreview("");
    generating.current = true;
    setBusy(true);
    onBusyChange(true);
    stream.send({
      url: "/api/novel",
      body: novelRequest(room.id, prompt, run.task),
    });
  }

  function generate(task: "chapter" | "summary" = "chapter") {
    if (!ready || generating.current || room.status === "ended") return;
    setError("");
    const current = latest.current;
    if (task === "chapter" && !isChapterTargetValid(current.words)) return;
    if (task === "summary" && !current.chapters.length) {
      setError("请先完成至少一章，再总结导出背景。");
      return;
    }
    const prompt =
      task === "summary"
        ? summaryPrompt(room.config, current)
        : chapterPrompt(room.config, current);
    if (prompt.length > maxNovelPromptLength) {
      setError(
        "小说已超出本次完整上下文容量，请导出当前卷并在新世界继续创作。",
      );
      return;
    }
    start(
      task === "summary"
        ? { task, config: room.config, novel: current }
        : { task, title: chapterTitle(current.chapters.length) },
      prompt,
    );
  }

  function summarizeFork() {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    if (!current.chapters.length) return;
    const prompt = forkSummaryPrompt(room.config, current);
    if (prompt.length > maxNovelPromptLength) {
      setError("自动总结的请求已超限，可手动填写剧情摘要。");
      return;
    }
    setForkSummary("");
    start({ task: "summary", forFork: true }, prompt);
  }

  function clearFork() {
    if (generating.current) return;
    setForkSummary("");
    setError("");
    if (input.current?.task === "summary" && "forFork" in input.current) {
      input.current = null;
      setPreview("");
    }
  }

  async function createFork(summary: string) {
    if (!ready || generating.current) throw new Error("当前暂不可创建 Fork。");
    const current = latest.current;
    const fork = prepareNovelFork(room.config, current, summary);
    if (
      !fork ||
      !forkFitsBudget(fork.length, chapterPrompt(room.config, current).length)
    )
      throw new Error("续写上下文仍然超限或没有缩短，请精简摘要。");
    generating.current = true;
    onBusyChange(true);
    try {
      const { room: created } = await worldRequest<{ room: WorldRoom }>(
        "rooms",
        "POST",
        { ...fork.config, kind: "novel" },
      );
      try {
        await novels.add({
          key: `${created.ownerId}:${created.id}`,
          novel: fork.novel,
        });
      } catch {
        try {
          await worldRequest(`rooms/${created.id}`, "DELETE");
        } catch {
          throw new Error(
            "本地小说写入失败，新建的空分支未能清理；原小说未改动。",
          );
        }
        throw new Error("无法保存小说分支，请检查浏览器存储空间。");
      }
      return created.id;
    } finally {
      generating.current = false;
      onBusyChange(false);
    }
  }

  function insertBefore(beforeId: string, requirements: string) {
    if (!ready || generating.current || room.status === "ended") return;
    if (!isChapterTargetValid(latest.current.words)) return;
    try {
      start(
        { task: "chapter", beforeId },
        insertChapterPrompt(
          room.config,
          latest.current,
          beforeId,
          requirements,
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法生成插入章节。");
    }
  }

  function discardInsertion() {
    if (generating.current) return;
    if (input.current?.task === "chapter" && input.current.beforeId) {
      input.current = null;
      setPreview("");
      setInserting(false);
    }
    setError("");
  }

  function rewrite(
    chapterId: string,
    requirements: string,
    range?: ChapterTextRange,
    compactContext = false,
    draft?: Chapter,
  ) {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    try {
      const prompt = rewritePrompt(
        room.config,
        draft ? replaceChapter(current, draft) : current,
        chapterId,
        requirements,
        range,
        compactContext,
      );
      start(
        {
          task: "rewrite",
          chapterId,
          novel: current,
          version: room.version,
          range,
          draft,
        },
        prompt,
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法生成重写草稿。");
    }
  }

  function discardRewrite() {
    if (generating.current) return;
    if (input.current?.task === "rewrite") {
      input.current = null;
      setPreview("");
      setRewriteReady(false);
    }
    setError("");
  }

  function resolveRewrite(draft?: Chapter) {
    const captured = input.current;
    if (generating.current || !rewriteReady || captured?.task !== "rewrite")
      return null;
    if (
      latest.current !== captured.novel ||
      captured.draft !== draft ||
      room.version !== captured.version ||
      room.status === "ended"
    ) {
      setError("小说或世界设定已变更，请重新生成重写草稿。");
      return null;
    }
    const next = replaceChapterText(
      draft ? replaceChapter(captured.novel, draft) : captured.novel,
      captured.chapterId,
      preview,
      captured.range,
    );
    const chapter = next.chapters.find(({ id }) => id === captured.chapterId);
    if (!chapter || chapter.text.length > maxChapterLength) {
      setError(
        `应用后本章会超过 ${maxChapterLength} 字，请缩短润色内容后重试。`,
      );
      return null;
    }
    discardRewrite();
    return next;
  }

  function applyRewrite() {
    const next = resolveRewrite();
    if (!next) return false;
    update(next);
    return true;
  }

  function applyDraftRewrite(draft: Chapter) {
    return resolveRewrite(draft)?.chapters.find(({ id }) => id === draft.id);
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
    inserting,
    rewriteReady,
    forkSummary,
    backgroundExport,
    async importNovel(imported: ImportedNovel) {
      if (!ready || generating.current)
        throw new Error("正在生成或读取小说，请稍后再导入。");
      setError("");
      const next = createImportedNovel(room.config, imported);
      if (!(await update(next, { persistFirst: true }))) {
        setError("导入未能保存，原小说已保留。请检查浏览器存储空间后重试。");
        return null;
      }
      input.current = null;
      setPreview("");
      setInserting(false);
      setRewriteReady(false);
      setForkSummary("");
      return next.chapters[0].id;
    },
    generate,
    summarizeFork,
    clearFork,
    createFork,
    insertBefore,
    discardInsertion,
    rewrite,
    discardRewrite,
    applyRewrite,
    applyDraftRewrite,
    stop() {
      stream.stop();
      end();
      setError("已停止，本次草稿未计入正文或导出文件，可以重新生成。");
    },
  };
}
