import { Lock, Moon } from "lucide-react";
import { memo, useMemo } from "react";
import {
  type ProseSettingKey,
  useProseSettingsStore,
} from "@/app/prose/_lib/store/prose-setting";
export function ProseSettings() {
  const settings = useMemo(() => {
    return [
      {
        settingKey: "readonly-mode",
        iconRender: (isActive: boolean) => (
          <Lock
            size={16}
            className={`cursor-pointer ${isActive ? "text-blue-600" : "text-gray-400"}`}
          />
        ),
      },
      {
        settingKey: "dark-mode",
        iconRender: (isActive: boolean) => (
          <Moon
            size={16}
            className={`cursor-pointer ${isActive ? "text-gray-400" : "text-blue-600"}`}
          />
        ),
      },
    ] satisfies {
      settingKey: ProseSettingKey;
      iconRender: (active: boolean) => React.ReactNode;
    }[];
  }, []);
  return (
    <div className="flex items-center space-x-2">
      {settings.map((setting) => (
        <ButtonSetting
          key={setting.settingKey}
          settingKey={setting.settingKey}
          iconRender={setting.iconRender}
        />
      ))}
    </div>
  );
}

const ButtonSetting = memo(function ButtonSetting(props: {
  iconRender: (isActive: boolean) => React.ReactNode;
  settingKey: ProseSettingKey;
}) {
  const { iconRender, settingKey } = props;
  const isActive = useProseSettingsStore((s) => s.isSettingEnabled(settingKey));
  const enableSetting = useProseSettingsStore((s) => s.enableSetting);
  const disableSetting = useProseSettingsStore((s) => s.disableSetting);
  return (
    <button
      onClick={() => {
        if (isActive) {
          disableSetting(settingKey);
        } else {
          enableSetting(settingKey);
        }
      }}
    >
      {iconRender(isActive)}
    </button>
  );
});
