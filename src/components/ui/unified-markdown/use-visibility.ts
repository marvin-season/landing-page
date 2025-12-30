import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function getSnapshot() {
  return document.visibilityState;
}

function getServerSnapshot(): DocumentVisibilityState {
  return "visible";
}

export function useVisibility() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsVisible() {
  const visibilityState = useVisibility();
  return visibilityState === "visible";
}
