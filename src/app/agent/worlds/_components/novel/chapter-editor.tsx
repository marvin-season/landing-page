"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { ArrowLeft, GitCompareArrows, PencilLine, Save } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  confirmAgentNavigation,
  useUnsavedNavigation,
} from "@/app/agent/_components/use-unsaved-navigation";
import { ChapterDiffView } from "./chapter-diff-view";
import {
  type ChapterTextRange,
  type ChapterTextSelection,
  textareaSelectionRange,
} from "./chapter-text";
import type { Chapter } from "./model";
import { RewritePopover } from "./rewrite-form";
import type { useNovel } from "./use-novel";

export function ChapterEditor({
  base,
  chapters,
  writer,
  ended,
  compactContext,
  onCompactContextChange,
  onSave,
  onSelectChapter,
  onExit,
}: {
  base: Chapter;
  chapters: readonly Chapter[];
  writer: Pick<
    ReturnType<typeof useNovel>,
    | "busy"
    | "error"
    | "stop"
    | "task"
    | "preview"
    | "rewriteReady"
    | "rewrite"
    | "discardRewrite"
    | "applyDraftRewrite"
  >;
  ended: boolean;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  onSave: (chapter: Chapter) => Promise<boolean>;
  onSelectChapter: (id: string) => void;
  onExit: () => void;
}) {
  const [draft, setDraft] = useState(base);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [target, setTarget] = useState<ChapterTextSelection | null>(null);
  const [appliedRange, setAppliedRange] = useState<ChapterTextRange | null>(
    null,
  );
  const editor = useRef<HTMLTextAreaElement>(null);
  const editorFrame = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLElement>(null);
  const pendingSelection = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingCaret = useRef<number | null>(null);
  const dirty = draft.text !== base.text;
  const highlight = target ?? appliedRange;
  const editingLocked = Boolean(target && (writer.busy || writer.rewriteReady));
  useUnsavedNavigation(dirty, "章节有未保存的修改，确定放弃并离开吗？");

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    const input = editor.current;
    if (target || caret === null || !input) return;
    pendingCaret.current = null;
    input.focus({ preventScroll: true });
    input.setSelectionRange(caret, caret);
  }, [target]);

  const syncMirror = useCallback(() => {
    const input = editor.current;
    const layer = mirror.current;
    if (!input || !layer) return;
    layer.style.width = `${input.clientWidth}px`;
    layer.scrollTop = input.scrollTop;
  }, []);

  useLayoutEffect(() => {
    const input = editor.current;
    if (!highlight || !input) return;
    syncMirror();
    const observer = new ResizeObserver(syncMirror);
    observer.observe(input);
    return () => observer.disconnect();
  }, [highlight, syncMirror]);

  useEffect(() => () => clearTimeout(pendingSelection.current), []);

  function closeRewrite() {
    writer.discardRewrite();
    setTarget(null);
  }

  async function save() {
    if (!dirty || saving || editingLocked) return;
    clearTimeout(pendingSelection.current);
    closeRewrite();
    setAppliedRange(null);
    setSaving(true);
    setSaveFailed(false);
    try {
      const saved = await onSave(draft);
      setSaveFailed(!saved);
      if (saved) setShowDiff(false);
    } finally {
      setSaving(false);
    }
  }

  function deleteSelection() {
    if (!target || editingLocked) return;
    const { start, end } = target;
    const before = draft.text.slice(0, start);
    pendingCaret.current = before.replace(/\r\n?/g, "\n").length;
    setDraft({ ...draft, text: before + draft.text.slice(end) });
    setAppliedRange(null);
    closeRewrite();
  }

  return (
    <div className="@container flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/95">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-2">
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <span className="shrink-0">章节目录</span>
          <select
            className="min-w-0 max-w-md truncate rounded-md border border-input bg-background px-3 py-1.5"
            value={base.id}
            disabled={dirty || saving || writer.busy}
            title={dirty ? "保存当前章节后可切换" : undefined}
            onChange={(event) => {
              closeRewrite();
              setShowDiff(false);
              onSelectChapter(event.target.value);
            }}
          >
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title || `第${index + 1}章`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">
            {showDiff ? "修改对比" : "编辑草稿"}
          </h2>
          {dirty ? (
            <span className="text-xs text-muted-foreground">未保存</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showDiff ? (
            <Button
              size="sm"
              variant="outline"
              disabled={writer.busy || saving}
              onClick={() => setShowDiff(false)}
            >
              <PencilLine data-icon="inline-start" />
              返回编辑
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty || editingLocked || writer.busy || saving}
              onClick={() => {
                closeRewrite();
                setShowDiff(true);
              }}
            >
              <GitCompareArrows data-icon="inline-start" />
              查看修改
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={writer.busy || saving}
            onClick={() => {
              if (!confirmAgentNavigation()) return;
              onExit();
            }}
          >
            <ArrowLeft data-icon="inline-start" />
            返回阅读
          </Button>
          <Button
            size="sm"
            disabled={!dirty || editingLocked || writer.busy || saving}
            onClick={() => void save()}
          >
            <Save data-icon="inline-start" />
            {saving ? "正在保存…" : "保存章节"}
          </Button>
        </div>
      </div>
      {saveFailed ? (
        <p role="alert" className="px-4 pt-2 text-sm text-destructive">
          保存失败，请重试。
        </p>
      ) : null}
      {showDiff ? (
        <section className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-3">
          <ChapterDiffView base={base} draft={draft} />
        </section>
      ) : (
        <div className="grid flex-1 grid-cols-1 @3xl:grid-cols-2 @3xl:divide-x @3xl:divide-border">
          <section className="order-last flex min-w-0 flex-col gap-3 border-t border-border p-4 @3xl:order-0 @3xl:border-t-0">
            <div className="flex min-h-8 items-center">
              <h2 className="text-sm font-medium text-muted-foreground">
                稳定版本
              </h2>
            </div>
            <textarea
              aria-label="稳定版本正文"
              readOnly
              value={base.text}
              className="min-h-48 w-full flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </section>
          <section className="flex min-w-0 flex-col gap-3 p-4">
            <div className="flex min-h-8 items-center">
              <h2 className="text-sm font-medium">编辑草稿</h2>
            </div>
            <div
              ref={editorFrame}
              className="relative flex min-h-48 flex-1 rounded-md bg-background"
            >
              {highlight ? (
                <div
                  ref={mirror}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-px overflow-hidden wrap-break-word whitespace-pre-wrap px-3 py-2 text-sm leading-7 text-transparent"
                >
                  {draft.text.slice(0, highlight.start)}
                  <mark
                    ref={mark}
                    className={cn(
                      "text-transparent",
                      target ? "bg-primary/25" : "bg-emerald-500/25",
                    )}
                  >
                    {draft.text.slice(highlight.start, highlight.end)}
                  </mark>
                  {draft.text.slice(highlight.end)}
                  {"\u200b"}
                </div>
              ) : null}
              <textarea
                ref={editor}
                aria-label="章节正文"
                readOnly={editingLocked || saving}
                value={draft.text}
                maxLength={40000}
                onScroll={syncMirror}
                onBlur={() => clearTimeout(pendingSelection.current)}
                onPointerDown={() => clearTimeout(pendingSelection.current)}
                onChange={(event) => {
                  clearTimeout(pendingSelection.current);
                  if (target) closeRewrite();
                  setAppliedRange(null);
                  setDraft({ ...draft, text: event.target.value });
                }}
                onSelect={(event) => {
                  if (editingLocked || saving) return;
                  const input = event.currentTarget;
                  clearTimeout(pendingSelection.current);
                  pendingSelection.current = setTimeout(() => {
                    if (document.activeElement !== input) return;
                    const { selectionStart, selectionEnd, selectionDirection } =
                      input;
                    const selection = textareaSelectionRange(
                      draft.text,
                      selectionStart,
                      selectionEnd,
                      selectionDirection,
                    );
                    if (!selection) {
                      if (target) closeRewrite();
                      return;
                    }
                    if (
                      target?.start === selection.start &&
                      target.end === selection.end
                    )
                      return;
                    writer.discardRewrite();
                    setAppliedRange(null);
                    setTarget(selection);
                  }, 100);
                }}
                className={cn(
                  "relative min-h-48 w-full flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  target && "selection:bg-transparent",
                )}
              />
            </div>
            {target ? (
              <RewritePopover
                key={`${target.start}:${target.end}`}
                anchor={mark}
                bounds={editorFrame}
                atStart={target.direction === "backward"}
                autoFocus={false}
                isPassage
                preview={writer.task === "rewrite" ? writer.preview : ""}
                draftReady={writer.rewriteReady}
                compactContext={compactContext}
                onCompactContextChange={onCompactContextChange}
                writer={writer}
                ended={
                  ended || !draft.text.slice(target.start, target.end).trim()
                }
                onDelete={deleteSelection}
                onClose={closeRewrite}
                onApply={() => {
                  const next = writer.applyDraftRewrite(draft);
                  if (!next) return;
                  setDraft(next);
                  setAppliedRange({
                    start: target.start,
                    end: target.start + writer.preview.length,
                  });
                  setTarget(null);
                }}
                onRewrite={(requirements) =>
                  writer.rewrite(
                    draft.id,
                    requirements,
                    { start: target.start, end: target.end },
                    compactContext,
                    draft,
                  )
                }
              />
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
