import Tooltip from "@/components/tooltip";
import { Switch } from "@/components/ui";
import { useChatSettingsStore } from "@/store/chat-settings-store";

export function ChatSettings() {
  const enableSetting = useChatSettingsStore((s) => s.enableSetting);
  const disableSetting = useChatSettingsStore((s) => s.disableSetting);
  const fixedChat = useChatSettingsStore((s) =>
    s.isSettingEnabled("fixed-chat"),
  );
  const paginationDisplay = useChatSettingsStore((s) =>
    s.isSettingEnabled("pagination-display"),
  );
  return (
    <div className="space-y-2 grid grid-cols-2 gap-2">
      <div className="text-sm font-medium text-slate-600">
        Disable Scroll Switch
      </div>
      <Tooltip
        content="Disable scroll to load more messages"
        className={"ml-auto"}
      >
        <Switch
          disabled={!paginationDisplay}
          checked={fixedChat}
          onCheckedChange={(next) => {
            if (next) enableSetting("fixed-chat");
            else disableSetting("fixed-chat");
          }}
        />
      </Tooltip>
      <div className="text-sm font-medium text-slate-600">
        Pagination Display
      </div>
      <Tooltip content="Display the message by page" className={"ml-auto"}>
        <Switch
          checked={paginationDisplay}
          onCheckedChange={(next) => {
            if (next) enableSetting("pagination-display");
            else disableSetting("pagination-display");
          }}
        />
      </Tooltip>
    </div>
  );
}
