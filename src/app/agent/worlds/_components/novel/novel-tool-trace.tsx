import { cn } from "@landing-page/utils";
import { LoaderCircle } from "lucide-react";
import { ToolBlock } from "@/app/agent/_components/ToolBlock";
import type { NovelRunToolCall } from "@/lib/group-chat/novel-run-contract";
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
          toolName={tool.name}
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

/** 输入框顶部：构思状态 + 工具调用过程。 */
export function NovelComposerThinking({
  label,
  tools,
  compact,
  className,
}: {
  label: string;
  tools: NovelRunToolCall[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5",
        className,
      )}
    >
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        {label}
      </p>
      {compact ? (
        <AppliedSkillChips tools={tools} />
      ) : tools.length ? (
        <NovelToolTrace tools={tools} />
      ) : (
        <p className="text-xs text-muted-foreground">
          需要时会在此挂载写作技法；也可直接开始写正文。
        </p>
      )}
    </div>
  );
}
