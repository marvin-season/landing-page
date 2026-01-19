import { Lock } from "lucide-react";
import { useProseSettingsStore } from "@/app/prose/_lib/store/prose-setting";
import { Button } from "@/components/ui/button";
export function ProseSettings() {
  const enableSetting = useProseSettingsStore((s) => s.enableSetting);
  const disableSetting = useProseSettingsStore((s) => s.disableSetting);
  const isReadonly = useProseSettingsStore((s) =>
    s.isSettingEnabled("readonly-mode"),
  );
  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        variant={isReadonly ? "outline" : "ghost"}
        title="Readonly Mode"
        aria-pressed={isReadonly}
        className={`p-1 border transition-colors ${
          isReadonly
            ? "bg-blue-100 text-blue-600 border-blue-400 shadow"
            : "bg-white text-gray-400 border-gray-200"
        }`}
        onClick={() => {
          if (isReadonly) {
            disableSetting("readonly-mode");
          } else {
            enableSetting("readonly-mode");
          }
        }}
        size="icon"
      >
        <Lock
          size={16}
          stroke={isReadonly ? "#2563eb" : "#9ca3af"}
          className={isReadonly ? "text-blue-600" : "text-gray-400"}
        />
      </Button>
    </div>
  );
}
