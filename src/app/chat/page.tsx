import { Bot, Menu } from "lucide-react";
import dynamic from "next/dynamic";
import { CreateSessionBtn } from "@/app/chat/_components/session/create-session-btn";
import { Drawer } from "@/components/drawer";

const ChatSidebar = dynamic(
  () =>
    import("@/app/chat/_components/sidebar/chat-sidebar").then(
      (mod) => mod.ChatSidebar,
    ),
  {},
);
export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <Drawer
        side="left"
        className="px-4"
        trigger={<Menu className="size-5 lg:hidden m-4" />}
      >
        <ChatSidebar className="w-full border-r-0" />
      </Drawer>
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-slate-400">
        <div className="w-20 h-20 bg-linear-to-br from-white to-slate-50 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
          <Bot className="w-10 h-10 opacity-10" />
        </div>
        <div className="my-6 text-center space-y-2">
          <p className="text-lg font-medium text-slate-500">
            Select a session or start a new conversation
          </p>
        </div>
        <CreateSessionBtn className="text-slate-500" />
      </div>
    </div>
  );
}
