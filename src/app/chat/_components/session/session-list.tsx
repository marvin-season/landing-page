"use client";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DeleteSessionBtn } from "@/app/chat/_components/session/delete-session-btn";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
export function SessionList() {
  const { sessions } = useSessionStore();
  const { sessionId } = useParams();
  return sessions
    .toSorted((a, b) => b.createdAt - a.createdAt)
    .map((session) => (
      <Link
        href={`/chat/${session.id}`}
        key={session.id}
        className={cn(
          "group relative flex items-center justify-between w-full p-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm",
          sessionId === session.id
            ? "bg-gray-100 shadow-sm ring-1 ring-slate-200 text-slate-900 font-medium"
            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <MessageSquare
            size={16}
            className={cn(
              "shrink-0 transition-opacity",
              sessionId === session.id
                ? "opacity-100 text-primary"
                : "opacity-50 group-hover:opacity-75",
            )}
          />
          <span className="truncate">{session.title}</span>
        </div>

        <div
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-200",
            "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <DeleteSessionBtn sessionId={session.id} />
        </div>
      </Link>
    ));
}
