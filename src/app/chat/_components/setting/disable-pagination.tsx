import { Switch } from "@/components/ui";
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
    <Switch
      className={className}
      checked={disableMessagePagination}
      onCheckedChange={setDisableMessagePagination}
    />
  );
}
