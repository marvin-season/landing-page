import { Home } from "lucide-react";
import Link from "next/link";
import { CreateSessionBtn } from "@/app/chat/_components/session/create-session-btn";
import { SessionList } from "@/app/chat/_components/session/session-list";
import Tooltip from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatSidebar(props: { className?: string }) {
  const { className } = props;

  return (
    <div className={cn("w-[280px] shadow-md flex flex-col h-full", className)}>
      <div className="flex items-center gap-1 p-4 ">
        <Tooltip content="Go to home">
          <Link href="/chat">
            <Button variant="outline">
              <Home size={16} />
            </Button>
          </Link>
        </Tooltip>
        <CreateSessionBtn className="flex-1" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Sessions
        </div>
        <SessionList />
      </div>
    </div>
  );
}
