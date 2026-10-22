import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Cached as a generic document, not as one particular record or business day.
// App reads the actual browser URL after hydration and loads local data.
export default function BookkeepingOfflinePage() {
  return <span hidden data-bookkeeping-offline-shell="true" />;
}
