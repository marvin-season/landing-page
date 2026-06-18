import { Trans } from "@lingui/react/macro";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { navLinks, profile, quotes } from "../data/home-data";
import { NavCard, Quote, Section } from "./index";

export function HomeContent() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:py-20">
        <section className="grid min-h-[62dvh] items-center gap-10 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.75fr)]">
          <div className="home-reveal flex flex-col items-start">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              {profile.eyebrow}
            </span>
            <h1 className="max-w-3xl text-5xl font-semibold leading-none tracking-normal text-foreground sm:text-6xl lg:text-7xl">
              {profile.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {profile.title}
              <span className="mx-2 text-border">/</span>
              {profile.subtitle}
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {profile.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedLink
                href="/agent"
                eventName="Home Hero CTA Click"
                eventProperties={{ target: "agent", location: "hero" }}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trans>Try Agent UI</Trans>
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </TrackedLink>
              <TrackedLink
                href="/resume"
                eventName="Home Hero CTA Click"
                eventProperties={{ target: "resume", location: "hero" }}
                className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-card/70 px-5 text-sm font-medium text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trans>View profile</Trans>
              </TrackedLink>
            </div>
          </div>

          <div
            className="home-reveal relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center md:ml-auto"
            style={{ "--home-reveal-delay": "120ms" } as React.CSSProperties}
          >
            <div className="absolute inset-6 rounded-full border border-border/60 bg-card/70 shadow-2xl shadow-primary/10" />
            <div className="absolute inset-0 rounded-full border border-border/40" />
            <div className="absolute inset-12 rounded-full border border-primary/15" />
            <Image
              unoptimized
              priority
              src={profile.avatar}
              alt={profile.avatarAlt}
              width={184}
              height={184}
              className="relative rounded-full border border-border/60 bg-background object-cover shadow-xl"
            />
          </div>
        </section>

        <Section title={<Trans>Navigation</Trans>} delay={180}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {navLinks.map((item) => (
              <NavCard key={item.href} {...item} />
            ))}
          </div>
        </Section>

        <Section title={<Trans>Sentences</Trans>} delay={260}>
          <div className="grid gap-3 md:grid-cols-2">
            {quotes.map((quote, index) => (
              <Quote key={index} delay={300 + index * 60}>
                {quote}
              </Quote>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
