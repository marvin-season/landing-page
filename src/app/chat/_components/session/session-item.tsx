import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { DeleteSessionBtn } from "@/app/chat/_components/session/delete-session-btn";
import { cn } from "@/lib/utils";
import type { ISession } from "@/store/session-store";

function SessionItem(props: { session: ISession; isSelected: boolean }) {
  const { session, isSelected } = props;
  return (
    <Link
      href={`/chat/${session.id}`}
      key={session.id}
      className={cn(
        "group relative flex items-center justify-between w-full p-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm",
        isSelected
          ? "bg-gray-100 shadow-sm ring-1 ring-slate-200 text-slate-900 font-medium"
          : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
      )}
    >
      <div className="w-full flex items-center gap-3 overflow-hidden group-hover:mask-[linear-gradient(to_right,black_0%,black_65%,transparent_85%,transparent)]">
        <MessageSquare
          size={12}
          className={cn(
            "shrink-0 transition-opacity",
            isSelected
              ? "opacity-100 text-primary"
              : "opacity-50 group-hover:opacity-75",
          )}
        />
        <span className="truncate flex-1">{session.title}</span>
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
  );
}

export default memo(SessionItem);
