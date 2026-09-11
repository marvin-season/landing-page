import { Loader2 } from "lucide-react";

export function ThreadHistoryLoading() {
  return (
    <div className="space-y-4 py-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2
          className="size-4 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        正在加载会话…
      </div>
      <div
        className="flex animate-pulse flex-col gap-4 motion-reduce:animate-none"
        aria-hidden="true"
      >
        <div className="agent-hand-border-soft w-2/3 self-end bg-secondary/40 p-4">
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
        <div className="agent-hand-border agent-paper-panel w-5/6 space-y-3 p-4">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
