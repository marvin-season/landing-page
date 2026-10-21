"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { createContext, type PropsWithChildren, useContext } from "react";

const OfflineNavigationContext = createContext(false);

/** The Next route tree identifies the cached document even at another URL. */
export function OfflineNavigationProvider({ children }: PropsWithChildren) {
  const segment = useSelectedLayoutSegment();

  return (
    <OfflineNavigationContext.Provider value={segment === "offline"}>
      {children}
    </OfflineNavigationContext.Provider>
  );
}

export function useOfflineNavigation() {
  return useContext(OfflineNavigationContext);
}
