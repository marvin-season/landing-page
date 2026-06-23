import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";

export default function AgentNotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Conversation not found
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            This conversation does not exist, was deleted, or is not available
            for the current account.
          </p>
        </div>

        <Link
          href="/agent"
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
        >
          <MessageSquarePlus className="size-4" />
          Start a new conversation
        </Link>
      </div>
    </div>
  );
}
