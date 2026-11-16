"use client";

import { AiInput, type AiMentionItem } from "@landing-page/biz-ui";
import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { Copy, Pause, Play, SkipForward } from "lucide-react";
import {
  InputSpeakerSelect,
  inputHint,
  inputPlaceholder,
} from "./input-speaker-select";

export function RoomComposer({
  draft,
  mentions,
  mentionItems,
  speaker,
  speakerLabel,
  paused,
  running,
  stopping,
  pending,
  actionPending,
  ended,
  draftStatus,
  error,
  onRetrySubmission,
  onDraftChange,
  onMentionsChange,
  onSpeakerChange,
  onSend,
  onStop,
  onContinue,
  onStep,
  onCopy,
}: {
  draft: string;
  mentions: AiMentionItem[];
  mentionItems: AiMentionItem[];
  speaker: string;
  speakerLabel: string;
  paused: boolean;
  running: boolean;
  stopping: boolean;
  pending: boolean;
  actionPending: boolean;
  ended: boolean;
  draftStatus: boolean;
  error: string;
  onRetrySubmission?: () => void;
  onDraftChange: (value: string) => void;
  onMentionsChange: (mentions: AiMentionItem[]) => void;
  onSpeakerChange: (value: string) => void;
  onSend: (resume?: boolean) => void;
  onStop: () => void;
  onContinue: () => void;
  onStep: () => void;
  onCopy: () => void;
}) {
  const canSend =
    speaker === "system"
      ? Boolean(draft.trim() || mentions.length)
      : Boolean(draft.trim());
  return (
    <footer className="shrink-0 border-t border-border px-4 py-2 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        {error ? (
          <Alert className="text-destructive">
            <AlertDescription>
              {error}
              {onRetrySubmission && !running ? (
                <Button variant="ghost" size="sm" onClick={onRetrySubmission}>
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
                  disabled={stopping}
                  onClick={onStop}
                >
                  <Pause size={16} data-icon="inline-start" />
                  {stopping ? "正在暂停…" : "暂停"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || actionPending}
                  onClick={onContinue}
                >
                  <Play size={16} data-icon="inline-start" />
                  {draftStatus ? "开始自动推进" : "继续故事"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={running || pending || actionPending}
                onClick={onStep}
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
              onValueChange={onDraftChange}
              mentions={mentions}
              onMentionsChange={onMentionsChange}
              mentionItems={mentionItems}
              mentionDisplay="inline"
              disabled={pending || actionPending}
              canSubmit={canSend}
              maxLength={8000}
              rows={1}
              onSubmit={() => onSend()}
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
                  onChange={onSpeakerChange}
                />
              }
              hint={inputHint(speaker, speakerLabel, paused, mentions.length)}
              footer={
                paused ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending || !canSend}
                    onClick={() => onSend(true)}
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
            <Button size="sm" variant="outline" onClick={onCopy}>
              <Copy data-icon="inline-start" />
              复制世界
            </Button>
          </div>
        )}
      </div>
    </footer>
  );
}
