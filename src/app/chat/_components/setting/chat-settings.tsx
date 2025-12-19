import { DisablePagination } from "@/app/chat/_components/setting/disable-pagination";

export function ChatSettings() {
  return (
    <div className="space-y-2 grid grid-cols-2 gap-2">
      <div className="text-sm font-medium text-slate-600">Fixed Chat</div>
      <DisablePagination className="ml-auto" />
    </div>
  );
}
