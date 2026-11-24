import { cn } from "@landing-page/utils";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

type BrandStatusPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  detail?: ReactNode;
  actions: ReactNode;
  className?: string;
};

export function BrandStatusPage({
  eyebrow,
  title,
  description,
  detail,
  actions,
  className,
}: BrandStatusPageProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-12",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_22%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-[color-mix(in_oklab,var(--secondary)_55%,transparent)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-1/5 size-80 rounded-full bg-[color-mix(in_oklab,var(--accent)_60%,transparent)] blur-3xl"
      />

      <div className="relative flex max-w-md flex-col items-center text-center">
        <div className="home-reveal relative mb-6 flex size-28 items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full border border-border/50 bg-card/70 shadow-lg shadow-primary/10 shinchan:matte-surface"
          />
          <Image
            unoptimized
            priority
            src="/shinchan.png"
            alt=""
            width={96}
            height={96}
            className="relative size-24 origin-bottom object-contain motion-safe:animate-home-avatar-walk"
          />
        </div>

        <p
          className="home-reveal text-sm font-medium tracking-[0.18em] text-primary uppercase"
          style={{ "--home-reveal-delay": "80ms" } as CSSProperties}
        >
          {eyebrow}
        </p>
        <h1
          className="home-reveal mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          style={{ "--home-reveal-delay": "140ms" } as CSSProperties}
        >
          {title}
        </h1>
        <p
          className="home-reveal mt-4 text-sm leading-7 text-muted-foreground sm:text-base"
          style={{ "--home-reveal-delay": "200ms" } as CSSProperties}
        >
          {description}
        </p>
        {detail ? (
          <div
            className="home-reveal mt-3 max-w-sm text-xs leading-6 text-muted-foreground/80"
            style={{ "--home-reveal-delay": "240ms" } as CSSProperties}
          >
            {detail}
          </div>
        ) : null}

        <div
          className="home-reveal mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ "--home-reveal-delay": "280ms" } as CSSProperties}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
