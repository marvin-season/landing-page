"use client";

import { cn } from "@landing-page/utils";
import type { ReactNode } from "react";
import type { ThinkingHistoryEntry } from "./thinking-history";
import { NovelThinkingHistoryButton } from "./thinking-history-panel";

/** 输入框顶：时间线与历史同一行对齐。 */
export function NovelComposerStatusBar({
  history,
  onClearHistory,
  reserveCollapse = false,
  children,
  className,
}: {
  history: ThinkingHistoryEntry[];
  onClearHistory?: () => void;
  /** FloatingComposer 右上角有收起按钮时预留空隙 */
  reserveCollapse?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        reserveCollapse && "pr-9",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <NovelThinkingHistoryButton
        entries={history}
        onClear={onClearHistory}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
