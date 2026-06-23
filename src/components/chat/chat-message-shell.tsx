import { cn } from "@landing-page/utils";
import { Bot, User } from "lucide-react";
import type { ReactNode } from "react";

type ChatMessageRole = "user" | "assistant";

const ROLE_STYLES: Record<
  ChatMessageRole,
  {
    row: string;
    bubble: string;
    avatar: string;
    icon: ReactNode;
  }
> = {
  user: {
    row: "justify-end",
    bubble:
      "agent-hand-border-soft agent-blue-fill max-w-[85%] px-4 py-3 text-sm leading-relaxed text-[var(--agent-ink)]",
    avatar:
      "agent-hand-border-soft agent-yellow-fill flex size-8 shrink-0 items-center justify-center text-[var(--agent-ink)]",
    icon: <User className="size-4" />,
  },
  assistant: {
    row: "",
    bubble:
      "agent-hand-border-soft min-w-0 max-w-[85%] bg-[rgba(255,253,244,0.82)] px-4 py-3 text-sm leading-relaxed text-[var(--agent-ink)]",
    avatar:
      "agent-hand-border-soft agent-green-fill flex size-8 shrink-0 items-center justify-center text-[var(--agent-ink)]",
    icon: <Bot className="size-4" />,
  },
};

export function ChatMessageShell({
  role,
  children,
  className,
  bubbleClassName,
}: {
  role: ChatMessageRole;
  children: ReactNode;
  className?: string;
  bubbleClassName?: string;
}) {
  const styles = ROLE_STYLES[role];

  return (
    <div className={cn("mb-4 flex gap-3", styles.row, className)}>
      {role === "assistant" ? (
        <div className={styles.avatar} aria-hidden>
          {styles.icon}
        </div>
      ) : null}
      <div className={cn(styles.bubble, bubbleClassName)}>{children}</div>
      {role === "user" ? (
        <div className={styles.avatar} aria-hidden>
          {styles.icon}
        </div>
      ) : null}
    </div>
  );
}
