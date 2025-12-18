import { SessionMenuTrigger } from "@/app/chat/_components/session/session-menu-trigger";

export function EmptyHeader() {
  return (
    <div className="sticky top-0 z-10 h-16 shrink-0 border-b border-slate-200/60 bg-white/60 backdrop-blur-md supports-backdrop-filter:bg-white/60">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-3 sm:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SessionMenuTrigger />
        </div>
      </div>
    </div>
  );
}
