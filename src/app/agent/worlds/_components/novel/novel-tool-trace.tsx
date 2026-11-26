"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ToolBlock } from "@/app/agent/_components/ToolBlock";
import type {
  NovelRunPhase,
  NovelRunToolCall,
} from "@/lib/group-chat/novel-run-contract";
import { WritingSkillIcon } from "./writing-skill-icons";

function skillNameFromTool(tool: NovelRunToolCall) {
  const output = tool.output;
  if (output && typeof output === "object" && "name" in output) {
    const name = (output as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name;
  }
  const input = tool.input;
  if (input && typeof input === "object" && "skillId" in input) {
    const id = (input as { skillId?: unknown }).skillId;
    if (typeof id === "string" && id.trim()) return id;
  }
  return null;
}

function skillIdFromTool(tool: NovelRunToolCall) {
  const output = tool.output;
  if (output && typeof output === "object" && "id" in output) {
    const id = (output as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  const input = tool.input;
  if (input && typeof input === "object" && "skillId" in input) {
    const id = (input as { skillId?: unknown }).skillId;
    if (typeof id === "string") return id;
  }
  return "";
}

function friendlyToolName(tool: NovelRunToolCall) {
  const skill = skillNameFromTool(tool);
  if (
    tool.name === "apply_writing_skill" ||
    tool.name.endsWith("apply_writing_skill")
  )
    return skill ? `挂载技法 · ${skill}` : "挂载写作技法";
  return tool.name;
}

function AppliedSkillChips({
  tools,
  className,
}: {
  tools: NovelRunToolCall[];
  className?: string;
}) {
  const applied = tools
    .filter((tool) => tool.state === "done")
    .map((tool) => ({
      id: skillIdFromTool(tool),
      name: skillNameFromTool(tool) || tool.name,
    }))
    .filter((item, index, list) =>
      item.id
        ? list.findIndex((other) => other.id === item.id) === index
        : true,
    );
  if (!applied.length) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>已挂技法</span>
      {applied.map((skill) => (
        <span
          key={skill.id || skill.name}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5"
        >
          {skill.id ? <WritingSkillIcon id={skill.id} /> : null}
          {skill.name}
        </span>
      ))}
    </div>
  );
}

export function NovelToolTrace({
  tools,
  className,
  compact,
}: {
  tools: NovelRunToolCall[];
  className?: string;
  /** 正文已开始后收成摘要条 */
  compact?: boolean;
}) {
  if (!tools.length) return null;
  if (compact) return <AppliedSkillChips tools={tools} className={className} />;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {tools.map((tool) => (
        <ToolBlock
          key={tool.id}
          toolName={friendlyToolName(tool)}
          input={tool.input ?? "…"}
          output={
            tool.state === "done"
              ? tool.output
              : tool.state === "error"
                ? { error: tool.errorText }
                : undefined
          }
          isStreaming={tool.state === "calling"}
          streamingPhase={
            tool.input === undefined ? "input-streaming" : "calling"
          }
        />
      ))}
    </div>
  );
}

function resolvePhase({
  phase,
  tools,
  hasText,
}: {
  phase?: NovelRunPhase;
  tools: NovelRunToolCall[];
  hasText: boolean;
}): NovelRunPhase {
  if (hasText) return "writing";
  if (phase) return phase;
  if (tools.length) return "applying_skills";
  return "preparing";
}

function TimelineStep({
  title,
  state,
  detail,
}: {
  title: string;
  state: "done" | "active" | "pending";
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          state === "done" &&
            "border-primary bg-primary text-primary-foreground",
          state === "active" && "border-primary text-primary",
          state === "pending" && "border-border text-muted-foreground",
        )}
      >
        {state === "done" ? (
          <Check className="size-2.5" />
        ) : state === "active" ? (
          <LoaderCircle className="size-2.5 animate-spin motion-reduce:animate-none" />
        ) : (
          <span className="size-1 rounded-full bg-current opacity-40" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "leading-4",
            state === "pending" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </p>
        {detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function phaseSummary(phase: NovelRunPhase, tools: NovelRunToolCall[]) {
  if (phase === "preparing") return "准备中";
  if (phase === "applying_skills") {
    const names = tools
      .map((tool) => skillNameFromTool(tool))
      .filter((name): name is string => Boolean(name));
    const unique = names.filter(
      (name, index, list) => list.indexOf(name) === index,
    );
    return unique.length ? `挂载 · ${unique.join("、")}` : "挂载技法中";
  }
  if (tools.length) {
    const names = tools
      .filter((tool) => tool.state === "done")
      .map((tool) => skillNameFromTool(tool))
      .filter((name): name is string => Boolean(name));
    const unique = names.filter(
      (name, index, list) => list.indexOf(name) === index,
    );
    return unique.length ? `已挂 · ${unique.join("、")}` : "撰写中";
  }
  return "撰写中";
}

/** 输入框顶部：可折叠的准备 → 挂载技法 → 撰写正文。 */
export function NovelComposerThinking({
  label,
  tools,
  phase,
  compact,
  active = true,
  className,
}: {
  label: string;
  tools: NovelRunToolCall[];
  phase?: NovelRunPhase;
  compact?: boolean;
  /** 仍在生成时顶栏显示旋转状态 */
  active?: boolean;
  className?: string;
}) {
  const hasText = Boolean(compact);
  const current = resolvePhase({ phase, tools, hasText });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (active && (current === "preparing" || current === "applying_skills"))
      setOpen(true);
  }, [active, current]);

  const preparingState = current === "preparing" ? "active" : "done";
  const skillsState =
    current === "preparing"
      ? "pending"
      : current === "applying_skills"
        ? "active"
        : "done";
  const writingState = current === "writing" ? "active" : "pending";
  const skillDetail = tools.length
    ? tools
        .map((tool) => skillNameFromTool(tool) || friendlyToolName(tool))
        .filter((name, index, list) => list.indexOf(name) === index)
        .join("、")
    : current === "applying_skills"
      ? "正在选择技法…"
      : current === "writing"
        ? "本次未挂载技法"
        : "需要时自动挂载";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "rounded-lg border border-border/70 bg-muted/40",
        className,
      )}
    >
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground outline-none hover:bg-muted/50"
      >
        {active ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        ) : (
          <Check className="size-3.5 shrink-0 text-primary" />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="hidden max-w-[40%] truncate text-xs font-normal text-muted-foreground sm:inline">
          {phaseSummary(current, tools)}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent variant="collapse">
        <div className="flex flex-col gap-3 border-t border-border/60 px-3 py-2.5">
          <div className="flex flex-col gap-2.5">
            <TimelineStep
              title="准备 Writer"
              state={preparingState}
              detail={
                preparingState === "active" ? "连接模型并装载上下文" : undefined
              }
            />
            <TimelineStep
              title="挂载写作技法"
              state={skillsState}
              detail={skillDetail}
            />
            <TimelineStep
              title="撰写正文"
              state={writingState}
              detail={
                writingState === "active"
                  ? "正文开始流出"
                  : writingState === "pending"
                    ? "技法就绪后开始"
                    : undefined
              }
            />
          </div>
          {compact ? (
            <AppliedSkillChips tools={tools} />
          ) : tools.length ? (
            <NovelToolTrace tools={tools} />
          ) : current === "preparing" && active ? (
            <p className="text-xs text-muted-foreground">
              正在准备；若需要技法，下一步会在此显示工具调用。
            </p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
