import { Trans } from "@lingui/react/macro";
import type { CSSProperties, ReactNode } from "react";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { cn } from "@/lib/utils";
import type { HomeNavLink } from "../data/home-data";

const getRevealStyle = (delay: number): CSSProperties =>
  ({ "--home-reveal-delay": `${delay}ms` }) as CSSProperties;

export function HomeSection({
  children,
  title,
  delay = 80,
  className,
}: {
  children: ReactNode;
  title: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div
        className="home-reveal select-none text-sm font-semibold uppercase text-muted-foreground tracking-[0.18em]"
        style={getRevealStyle(delay)}
      >
        {title}
      </div>
      <div
        className="home-reveal flex flex-col gap-3"
        style={getRevealStyle(delay + 80)}
      >
        {children}
      </div>
    </section>
  );
}

export function NavCard({
  href,
  analyticsId,
  title,
  description,
  badge,
  icon: Icon,
}: HomeNavLink) {
  const external = href.startsWith("http");

  return (
    <TrackedLink
      href={href}
      eventName="Home Navigation Click"
      eventProperties={{
        target: analyticsId,
        href,
        location: "home_navigation",
        external,
      }}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/70 p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/45 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-primary/0 transition-colors duration-300 group-hover:bg-primary/60" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 text-foreground transition-colors duration-300 group-hover:border-primary/35 group-hover:text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground tracking-[0.16em]">
          {badge}
        </span>
      </div>
      <h3 className="text-base font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <span className="mt-4 block text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
        {external ? <Trans>Open reference</Trans> : <Trans>Open page</Trans>}
      </span>
    </TrackedLink>
  );
}

export function Quote({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="home-reveal rounded-lg border border-border/60 bg-background/65 px-4 py-3 text-sm leading-relaxed text-muted-foreground italic transition-colors duration-300 hover:border-primary/30 hover:text-foreground"
      style={getRevealStyle(delay)}
    >
      &ldquo;{children}&rdquo;
    </div>
  );
}

export { HomeSection as Section };
