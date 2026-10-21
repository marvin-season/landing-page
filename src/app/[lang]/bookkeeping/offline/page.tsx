import type { Metadata } from "next";
import { OfflineApp } from "../_components/pwa/offline-app";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Cached as a generic document, not as one particular record or business day.
// Normal pages use Next routing; only this fallback resolves local URLs itself.
export default function BookkeepingOfflinePage() {
  return (
    <>
      <span hidden data-bookkeeping-offline-shell="true" />
      <OfflineApp />
    </>
  );
}
