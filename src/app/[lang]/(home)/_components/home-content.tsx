import { cn } from "@landing-page/utils";
import { Trans } from "@lingui/react/macro";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/link/link";
import { homeProfiles, navLinks, profile } from "../data/home-data";
import { NavigationCarousel, Section } from "./index";

export function HomeContent() {
  return (
    <main className="min-h-dvh bg-background text-foreground shinchan:bg-transparent apple:bg-transparent">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:py-20">
        <section className="grid min-h-[62dvh] items-center gap-10 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.75fr)]">
          {/* Use the existing theme classes so SSR and saved themes show the same copy. */}
          {homeProfiles.map((homeProfile) => (
            <div
              key={homeProfile.theme}
              className={cn(
                "home-reveal flex flex-col items-start",
                homeProfile.theme === "default" &&
                  "shinchan:hidden loopy:hidden",
                homeProfile.theme === "shinchan" && "hidden shinchan:flex",
                homeProfile.theme === "loopy" && "hidden loopy:flex",
              )}
            >
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <Sparkles
                  className="size-3.5 text-primary"
                  aria-hidden="true"
                />
                {homeProfile.eyebrow}
              </span>
              <h1 className="max-w-3xl text-xl font-semibold leading-none tracking-normal text-foreground sm:text-6xl lg:text-7xl">
                {homeProfile.name}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                {homeProfile.title}
                <span className="mx-2 text-border">/</span>
                {homeProfile.subtitle}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {homeProfile.summary}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/knowledge"
                  eventName="Home Hero CTA Click"
                  eventProperties={{ target: "knowledge", location: "hero" }}
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shinchan:shadow-sm shinchan:hover:shadow-sm apple:shadow-sm apple:hover:shadow-sm"
                >
                  <Trans>Try Knowledge</Trans>
                  <ArrowRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href={homeProfile.action.href}
                  eventName="Home Hero CTA Click"
                  eventProperties={{
                    target: homeProfile.action.analyticsId,
                    location: "hero",
                  }}
                  target={homeProfile.action.external ? "_blank" : undefined}
                  rel={homeProfile.action.external ? "noreferrer" : undefined}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-card/70 px-5 text-sm font-medium text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shinchan:shadow-sm shinchan:hover:shadow-sm apple:glass-surface apple:shadow-sm apple:hover:shadow-sm"
                >
                  {homeProfile.action.label}
                </Link>
              </div>
            </div>
          ))}

          <div
            className="home-reveal relative mx-auto flex aspect-square w-full max-w-85 items-center justify-center md:ml-auto"
            style={{ "--home-reveal-delay": "120ms" } as React.CSSProperties}
          >
            <div className="absolute inset-6 rounded-full border border-border/60 bg-card/70 shadow-2xl shadow-primary/10 shinchan:matte-surface apple:glass-surface hidden shinchan:block loopy:block" />
            <div className="absolute inset-0 rounded-full border border-border/40 hidden shinchan:block loopy:block" />
            <div className="absolute inset-12 rounded-full border border-primary/15 hidden shinchan:block loopy:block" />
            <Image
              unoptimized
              priority
              src={profile.avatar}
              alt={profile.avatarAlt}
              width={184}
              height={184}
              className="relative rounded-full border border-border/60 bg-background object-cover shadow-xl shinchan:shadow-sm apple:shadow-sm origin-bottom motion-safe:animate-home-avatar-walk hidden shinchan:block"
            />
            <Image
              unoptimized
              priority
              src="/bbq/companions/hello-still.png"
              alt="Loopy"
              width={184}
              height={184}
              className="relative size-46 object-contain origin-bottom motion-safe:animate-home-avatar-walk hidden loopy:block"
            />
            <div
              aria-hidden="true"
              className="size-46 rounded-full border border-border/60 shinchan:hidden loopy:hidden"
            />
          </div>
        </section>

        <Section title={<Trans>Navigation</Trans>} delay={180}>
          <NavigationCarousel items={navLinks} />
        </Section>
      </div>
    </main>
  );
}
