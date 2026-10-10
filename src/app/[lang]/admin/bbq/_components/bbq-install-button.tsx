"use client";

import { Button } from "@landing-page/design-system";
import * as Dialog from "@radix-ui/react-dialog";
import { Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type InstallPromptEvent = Event & {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function BbqInstallButton() {
  const installPrompt = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
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
      setOpen(false);
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

  async function install() {
    const prompt = installPrompt.current;
    if (!prompt) {
      setOpen(true);
      return;
    }

    installPrompt.current = null;
    setInstalling(true);
    try {
      await prompt.prompt();
    } catch {
      setOpen(true);
    } finally {
      setInstalling(false);
    }
  }

  if (installed) return null;

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
          安装应用
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border bg-card p-4 text-foreground shadow-lg focus:outline-none">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              安装天天记账
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭安装说明"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            添加到主屏幕后，可通过专属图标直接打开记账页面。
          </Dialog.Description>
          <ul className="mt-4 space-y-3 text-sm">
            <li>iPhone / iPad：在 Safari 中打开，点击分享 → 添加到主屏幕。</li>
            <li>Android：在 Chrome 菜单中选择“添加到主屏幕”或“安装应用”。</li>
            <li>电脑：在 Chrome / Edge 地址栏或菜单中选择“安装应用”。</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            请使用 HTTPS
            网站地址。当前启动和切换页面需要联网；数据保存在本机，迁移设备或浏览器前请导出备份。
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
