"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** 流式工具调用的阶段：接收参数中 | 正在执行 | 已完成 */
export type ToolStreamingPhase = "input-streaming" | "calling" | "done";

export function ToolBlock({
  toolName,
  input,
  output,
  isStreaming,
  streamingPhase,
}: {
  toolName: string;
  input: unknown;
  output?: unknown;
  isStreaming?: boolean;
  /** 仅当 isStreaming 时有效：当前处于接收参数 / 调用中 / 已有输出 */
  streamingPhase?: ToolStreamingPhase;
}) {
  const inputStr =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const outputStr =
    output === undefined
      ? undefined
      : typeof output === "string"
        ? output
        : JSON.stringify(output, null, 2);

  const isCalling =
    isStreaming && streamingPhase === "calling";
  const isReceivingInput =
    isStreaming && streamingPhase === "input-streaming";

  return (
    <Card
      className={cn(
        "border-primary/20 bg-primary/5 shadow-sm transition-shadow",
        isStreaming && "ring-1 ring-primary/30 shadow-md",
      )}
    >
      <Collapsible defaultOpen={true} className="w-full [&[data-state=open]_[data-tool-chevron]]:rotate-180">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none pb-2 transition-colors hover:bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-primary">
              <ChevronDown
                data-tool-chevron
                className="size-4 shrink-0 transition-transform duration-200"
                aria-hidden
              />
              {isStreaming ? (
                <span className="flex size-2 animate-pulse rounded-full bg-primary" />
              ) : null}
              工具调用 · {toolName}
              {isReceivingInput ? (
                <span className="ml-1 text-xs font-normal normal-case tracking-normal text-muted-foreground">
                  接收参数中…
                </span>
              ) : null}
              {isCalling ? (
                <span className="ml-1 flex items-center gap-1.5 text-xs font-normal normal-case tracking-normal text-primary">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  正在执行…
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs">
              <span className="text-muted-foreground">
                {isStreaming && !outputStr ? "输入（流式）：" : "输入："}
              </span>
              <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap text-foreground/90 wrap-anywhere">
                {inputStr || "…"}
              </pre>
            </div>
            {isCalling ? (
              <div
                className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-3 font-mono text-xs"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                <span className="text-muted-foreground">
                  正在调用工具 <span className="font-medium text-foreground">{toolName}</span>，请稍候…
                </span>
              </div>
            ) : outputStr !== undefined ? (
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs">
                <span className="text-muted-foreground">输出：</span>
                <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap text-foreground/90 wrap-anywhere">
                  {outputStr}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
