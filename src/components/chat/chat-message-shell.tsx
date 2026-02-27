import { Bot, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    bubble: "max-w-[85%] rounded-2xl border border-border/50 bg-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm",
    avatar:
      "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary",
    icon: <User className="size-4" />,
  },
  assistant: {
    row: "",
    bubble:
      "min-w-0 max-w-[85%] rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm",
    avatar:
      "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
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
