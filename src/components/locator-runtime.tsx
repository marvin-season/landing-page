"use client";

import { useEffect } from "react";

export function LocatorRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let isMounted = true;

    import("@locator/runtime").then(({ default: setupLocator }) => {
      if (!isMounted) {
        return;
      }

      setupLocator({
        adapter: "jsx",
        showIntro: false,
      });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
