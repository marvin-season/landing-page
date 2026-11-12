import { Card } from "@landing-page/design-system";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const gradientVariants = cva(
  "pointer-events-none absolute inset-0 -z-10 bg-linear-to-br",
  {
    variants: {
      tone: {
        violet:
          "from-violet-200/75 via-fuchsia-100/55 to-rose-100/65 dark:from-violet-500/20 dark:via-fuchsia-500/10 dark:to-rose-500/15",
        sky: "from-sky-200/75 via-cyan-100/55 to-indigo-100/65 dark:from-sky-500/20 dark:via-cyan-500/10 dark:to-indigo-500/15",
        emerald:
          "from-emerald-200/75 via-teal-100/55 to-sky-100/65 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-sky-500/15",
        amber:
          "from-amber-200/75 via-orange-100/55 to-rose-100/65 dark:from-amber-500/20 dark:via-orange-500/10 dark:to-rose-500/15",
        rose: "from-rose-200/75 via-pink-100/55 to-purple-100/65 dark:from-rose-500/20 dark:via-pink-500/10 dark:to-purple-500/15",
        indigo:
          "from-indigo-200/75 via-violet-100/55 to-cyan-100/65 dark:from-indigo-500/20 dark:via-violet-500/10 dark:to-cyan-500/15",
      },
    },
  },
);

const tones = ["violet", "sky", "emerald", "amber", "rose", "indigo"] as const;

export function WorldCard({
  seed,
  children,
}: {
  seed: string;
  children: ReactNode;
}) {
  // Stable pseudo-random colors keep SSR and client renders in sync.
  let hash = 0;
  for (const char of seed)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;

  return (
    <Card className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className={gradientVariants({ tone: tones[hash % tones.length] })}
      />
      {children}
    </Card>
  );
}
