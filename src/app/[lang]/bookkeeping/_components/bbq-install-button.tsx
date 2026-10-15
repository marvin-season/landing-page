"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import * as Dialog from "@radix-ui/react-dialog";
import { Smartphone, X } from "lucide-react";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type InstallPromptEvent = Event & {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
};

const InstallContext = createContext<{
  installed: boolean;
  installing: boolean;
  requestInstall: () => Promise<boolean>;
} | null>(null);

// 安装事件可能在首页触发，由常驻 layout 保存，切到设置后仍可使用原生安装。
export function BbqInstallProvider({ children }: PropsWithChildren) {
  const installPrompt = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => {
      setInstalled(
        standalone.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    };
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      installPrompt.current = event as InstallPromptEvent;
    };
    const onInstalled = () => {
      installPrompt.current = null;
      setInstalled(true);
    };

    syncDisplayMode();
    standalone.addEventListener("change", syncDisplayMode);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      standalone.removeEventListener("change", syncDisplayMode);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function requestInstall() {
    const prompt = installPrompt.current;
    if (!prompt) {
      return false;
    }

    installPrompt.current = null;
    setInstalling(true);
    try {
      await prompt.prompt();
      return true;
    } catch {
      return false;
    } finally {
      setInstalling(false);
    }
  }

  return (
    <InstallContext.Provider value={{ installed, installing, requestInstall }}>
      {children}
    </InstallContext.Provider>
  );
}

export function BbqInstallButton() {
  const { t } = useLingui();
  const context = useContext(InstallContext);
  const [open, setOpen] = useState(false);
  if (!context) throw new Error("BbqInstallButton requires BbqInstallProvider");
  const { installed, installing, requestInstall } = context;

  async function install() {
    if (!(await requestInstall())) setOpen(true);
  }

  if (installed) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>已安装到主屏幕</Trans>
      </p>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={installing}
          onClick={(event) => {
            event.preventDefault();
            void install();
          }}
        >
          <Smartphone className="size-4" aria-hidden="true" />
          <Trans>安装应用</Trans>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-110 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-110 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-auto overscroll-contain rounded-xl border bg-card p-4 text-foreground shadow-lg focus:outline-none">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              <Trans>安装露记</Trans>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t`关闭安装说明`}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            <Trans>添加到主屏幕后，可通过专属图标直接打开记账页面。</Trans>
          </Dialog.Description>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Trans>
                iPhone / iPad：在 Safari 中打开，点击分享 → 添加到主屏幕。
              </Trans>
            </li>
            <li>
              <Trans>
                Android：在 Chrome 菜单中选择“添加到主屏幕”或“安装应用”。
              </Trans>
            </li>
            <li>
              <Trans>
                电脑：在 Chrome / Edge 地址栏或菜单中选择“安装应用”。
              </Trans>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            <Trans>
              请使用 HTTPS
              网站地址。首次联网完成离线准备后，可离线启动和记账；数据保存在本机，迁移设备或浏览器前请导出备份。
            </Trans>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
