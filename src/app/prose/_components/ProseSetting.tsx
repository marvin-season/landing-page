import { Lock } from "lucide-react";
import { useProseSettingsStore } from "@/app/prose/_lib/store/prose-setting";
export function ProseSettings() {
  return (
    <div className="flex items-center space-x-2">
      <ReadonlySetting />
    </div>
  );
}

function ReadonlySetting() {
  const enableSetting = useProseSettingsStore((s) => s.enableSetting);
  const disableSetting = useProseSettingsStore((s) => s.disableSetting);
  const isReadonly = useProseSettingsStore((s) =>
    s.isSettingEnabled("readonly-mode"),
  );
  return (
    <Lock
      size={16}
      className={`text-blue-600 cursor-pointer ${isReadonly ? "text-blue-600" : "text-gray-400"}`}
      onClick={() => {
        if (isReadonly) {
          disableSetting("readonly-mode");
        } else {
          enableSetting("readonly-mode");
        }
      }}
    />
  );
}
