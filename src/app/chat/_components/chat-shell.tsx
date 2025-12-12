"use client";

import { X } from "lucide-react";
import { ChatSidebar } from "@/app/chat/_components/chat-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatSettingsStore } from "@/store/chat-settings-store";

export function ChatShell(props: { children: React.ReactNode }) {
  const { children } = props;
  const isSidebarOpen = useChatSettingsStore((s) => s.isSidebarOpen);
  const closeSidebar = useChatSettingsStore((s) => s.closeSidebar);

  return (
    <div className="flex h-dvh min-h-dvh bg-white overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <ChatSidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50",
          isSidebarOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!isSidebarOpen}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity",
            isSidebarOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white shadow-xl border-r border-slate-200 transition-transform duration-200 will-change-transform",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-14 px-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Menu</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="h-[calc(100dvh-56px)] overflow-y-auto">
            <ChatSidebar
              className="w-full border-r-0"
              onNavigate={closeSidebar}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 min-h-0 h-full flex">{children}</div>
    </div>
  );
}
