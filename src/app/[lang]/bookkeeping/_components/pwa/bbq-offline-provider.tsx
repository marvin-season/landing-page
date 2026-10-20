"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLanguage } from "@/hooks/use-language";
import { bookkeepingLocales } from "@/lib/bookkeeping-pwa/routes";

type OfflineStatus =
  | "preparing"
  | "ready"
  | "error"
  | "unsupported"
  | "development";
const OfflineContext = createContext<{
  status: OfflineStatus;
  updateAvailable: boolean;
  retry: () => void;
} | null>(null);

function prepare(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(ready);
    };
    const timeout = window.setTimeout(() => finish(false), 60_000);
    channel.port1.onmessage = (event) => finish(event.data?.ready === true);
    worker.postMessage({ type: "BOOKKEEPING_PREPARE" }, [channel.port2]);
  });
}

export function BbqOfflineProvider({ children }: PropsWithChildren) {
  const { currentLanguage } = useLanguage();
  const [status, setStatus] = useState<OfflineStatus>("preparing");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries registration and cache preparation.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setStatus("development");
      return;
    }
    if (
      !window.isSecureContext ||
      !("serviceWorker" in navigator) ||
      !bookkeepingLocales.some((locale) => locale === currentLanguage)
    ) {
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;
    const cleanups: (() => void)[] = [];

    const check = async () => {
      if (cancelled || !registration) return;
      setUpdateAvailable(Boolean(registration.waiting));
      if (!registration.active || registration.active.state !== "activated")
        return;
      const ready = await prepare(registration.active);
      if (!cancelled) setStatus(ready ? "ready" : "error");
    };
    const watch = () => {
      const installing = registration?.installing;
      if (!installing) return;
      const changed = () => {
        if (installing.state === "redundant" && !registration?.active) {
          if (!cancelled) setStatus("error");
        }
        void check();
      };
      installing.addEventListener("statechange", changed);
      cleanups.push(() =>
        installing.removeEventListener("statechange", changed),
      );
    };
    const online = () => {
      if (registration) {
        void registration.update().catch(() => {});
        void check();
      } else {
        setAttempt((value) => value + 1);
      }
    };

    setStatus("preparing");
    setUpdateAvailable(false);
    void navigator.serviceWorker
      .register(`/bbq-pwa/sw.js?lang=${currentLanguage}`, {
        scope: `/${currentLanguage}/bookkeeping`,
        updateViaCache: "none",
      })
      .then((result) => {
        if (cancelled) return;
        registration = result;
        registration.addEventListener("updatefound", watch);
        cleanups.push(() => result.removeEventListener("updatefound", watch));
        watch();
        void check();
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    navigator.serviceWorker.addEventListener("controllerchange", check);
    window.addEventListener("online", online);
    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
      navigator.serviceWorker.removeEventListener("controllerchange", check);
      window.removeEventListener("online", online);
    };
  }, [currentLanguage, attempt]);

  return (
    <OfflineContext.Provider
      value={{
        status,
        updateAvailable,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useBbqOffline() {
  return useContext(OfflineContext);
}
