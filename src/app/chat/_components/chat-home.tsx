"use client";

import { Bot, Menu, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useChatSettingsStore } from "@/store/chat-settings-store";
import { useSessionStore } from "@/store/session-store";

export function ChatHome() {
  const router = useRouter();
  const openSidebar = useChatSettingsStore((s) => s.openSidebar);
  const { createNewSession } = useSessionStore();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <header className="sticky top-0 z-10 h-16 shrink-0 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl supports-backdrop-filter:bg-white/60">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-3 sm:px-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openSidebar}
            className="md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex shrink-0 items-center justify-center rounded-xl bg-primary/10 p-2 text-primary">
              <Bot className="size-4" />
            </span>
            <div className="truncate text-base font-semibold text-slate-900">
              Chat
            </div>
          </div>

          <Button
            type="button"
            onClick={() => {
              const id = createNewSession();
              router.push(`/chat/${id}`);
            }}
            className="shrink-0"
          >
            <Plus className="size-4" />
            New Chat
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-slate-400">
        <div className="w-20 h-20 bg-linear-to-br from-white to-slate-50 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
          <Bot className="w-10 h-10 opacity-10" />
        </div>
        <div className="mt-6 text-center space-y-2">
          <p className="text-lg font-medium text-slate-700">
            选择一个会话或开始新的对话
          </p>
          <p className="text-sm text-slate-400">
            移动端可点击左上角菜单查看会话列表
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => {
            const id = createNewSession();
            router.push(`/chat/${id}`);
          }}
        >
          <Plus className="size-4" />
          开始新对话
        </Button>
      </div>
    </div>
  );
}
