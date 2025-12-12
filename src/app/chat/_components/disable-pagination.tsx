import { Switch } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useChatSettingsStore } from "@/store/chat-settings-store";

export function DisablePagination(props: { className?: string }) {
  const { className } = props;
  const disableMessagePagination = useChatSettingsStore(
    (s) => s.disableMessagePagination,
  );
  const setDisableMessagePagination = useChatSettingsStore(
    (s) => s.setDisableMessagePagination,
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 shadow-xs backdrop-blur-md",
        className,
      )}
    >
      <span className="text-xs text-slate-600">禁用翻页</span>
      <Switch
        checked={disableMessagePagination}
        onCheckedChange={setDisableMessagePagination}
      />
    </div>
  );
}
