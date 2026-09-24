import { cn } from "@landing-page/utils";
import { Trans } from "@lingui/react/macro";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/components/link/link";
import type { HomeNavLink } from "../data/home-data";

const getRevealStyle = (delay: number): CSSProperties =>
  ({ "--home-reveal-delay": `${delay}ms` }) as CSSProperties;

export function Section({
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

export function NavigationCarousel({ items }: { items: HomeNavLink[] }) {
  return (
    <div className="relative isolate">
      <div className="group/navigation -mx-2 overflow-x-auto px-2 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max animate-[home-navigation-scroll_48s_linear_infinite] group-hover/navigation:paused group-focus-within/navigation:paused motion-reduce:animate-none">
          {[false, true].map((duplicate) => (
            <div
              key={String(duplicate)}
              aria-hidden={duplicate || undefined}
              className={cn(
                "flex shrink-0 gap-4 pr-4",
                duplicate && "motion-reduce:hidden",
              )}
            >
              {items.map((item) => (
                <NavCard key={item.href} {...item} duplicate={duplicate} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-2 z-20 w-8 bg-background/60 backdrop-blur-md mask-[linear-gradient(to_right,black,transparent)] sm:w-16"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -right-2 z-20 w-8 bg-background/60 backdrop-blur-md mask-[linear-gradient(to_left,black,transparent)] sm:w-16"
      />
    </div>
  );
}

export function NavCard({
  href,
  analyticsId,
  title,
  description,
  badge,
  icon: Icon,
  duplicate = false,
}: HomeNavLink & { duplicate?: boolean }) {
  const external = href.startsWith("http");
  const featured = href === "/knowledge";

  return (
    <Link
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
      tabIndex={duplicate ? -1 : undefined}
      data-featured={featured || undefined}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-64 shrink-0 hover:z-10 hover:scale-[1.02] focus-visible:border-primary/45 focus-visible:bg-primary/5 motion-reduce:transform-none flex flex-col bg-linear-to-br from-card/90 to-muted/30 hover:to-primary/10 shinchan:matte-surface shinchan:hover:shadow-sm apple:glass-surface apple:hover:shadow-sm data-[featured=true]:isolate data-[featured=true]:border-0 data-[featured=true]:p-4.25 data-[featured=true]:shadow-primary/15"
    >
      {featured && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/15 via-card/80 to-chart-2/15"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] p-[1.5px] mask-[linear-gradient(#fff_0_0),linear-gradient(#fff_0_0)] [mask-clip:content-box,border-box] mask-exclude"
          >
            <span className="absolute -inset-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--primary)_90deg,transparent_150deg,transparent_240deg,var(--chart-2)_300deg,transparent_360deg)] motion-safe:animate-[spin_6s_linear_infinite]" />
          </span>
        </>
      )}
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary transition-colors duration-300 group-hover:text-primary group-hover:bg-primary/10">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground tracking-[0.16em] group-data-[featured=true]:border-primary/25 group-data-[featured=true]:bg-primary group-data-[featured=true]:text-primary-foreground">
          {badge}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground transition-colors duration-300 group-hover:text-primary leading-snug">
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      <span className="mt-auto block text-xs font-medium text-primary opacity-60 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 pt-3 group-focus-visible:opacity-100">
        {external ? <Trans>Open reference</Trans> : <Trans>Open page</Trans>}
      </span>
    </Link>
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
