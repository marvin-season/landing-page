import { Switch } from "@/components/ui";
import { useChatSettingsStore } from "@/store/chat-settings-store";

export function ChatSettings() {
  const addSetting = useChatSettingsStore((s) => s.addSetting);
  const removeSetting = useChatSettingsStore((s) => s.removeSetting);
  const fixedChat = useChatSettingsStore((s) => s.hasSetting("fixed-chat"));
  const paginationDisplay = useChatSettingsStore((s) =>
    s.hasSetting("pagination-display"),
  );
  return (
    <div className="space-y-2 grid grid-cols-2 gap-2">
      <div className="text-sm font-medium text-slate-600">Fixed Chat</div>
      <Switch
        disabled={!paginationDisplay}
        className={"ml-auto"}
        checked={fixedChat}
        onCheckedChange={(next) => {
          if (next) addSetting("fixed-chat");
          else removeSetting("fixed-chat");
        }}
      />
      <div className="text-sm font-medium text-slate-600">
        Pagination Display
      </div>
      <Switch
        className={"ml-auto"}
        checked={paginationDisplay}
        onCheckedChange={(next) => {
          if (next) addSetting("pagination-display");
          else removeSetting("pagination-display");
        }}
      />
    </div>
  );
}
