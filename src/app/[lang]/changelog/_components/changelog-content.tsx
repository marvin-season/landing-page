import { Trans } from "@lingui/react/macro";
import { ArrowLeft, ArrowRight, History } from "lucide-react";
import Link from "next/link";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { changelogReleases } from "./changelog-data";

export function ChangelogContent({ lang }: { lang: string }) {
  return (
    <main className="min-h-dvh bg-background text-foreground shinchan:bg-transparent">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:py-20">
        <Link
          href={`/${lang}`}
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <Trans>Back to home</Trans>
        </Link>

        <header className="flex flex-col items-start gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <History className="size-3.5 text-primary" aria-hidden="true" />
            <Trans>Changelog</Trans>
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            <Trans>Product updates</Trans>
          </h1>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            <Trans>
              Three shipped iterations of the Docs workspace, from reading files
              to citing PDF text to selection-aware AI.
            </Trans>
          </p>
        </header>

        <nav>
          <h2 className="sr-only">
            <Trans>Release versions</Trans>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {changelogReleases.map((release) => (
              <li key={release.version}>
                <a
                  href={`#${release.version}`}
                  className="inline-flex h-8 items-center rounded-full border border-border/70 bg-card/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {release.version}
                  <span className="sr-only"> {release.branch}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ol className="relative space-y-8 border-l border-border/60 pl-6 sm:pl-8">
          {changelogReleases.map((release) => {
            const Icon = release.icon;
            return (
              <li
                key={release.version}
                id={release.version}
                className="relative scroll-mt-8"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-5 -left-9.5 flex size-7 items-center justify-center rounded-full border border-border/70 bg-background text-primary sm:-left-11.5"
                >
                  <Icon className="size-3.5" />
                </span>
                <article className="rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm sm:p-6 shinchan:matte-surface">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                      {release.version}
                    </span>
                    {release.current ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-primary-foreground">
                        <Trans>Current</Trans>
                      </span>
                    ) : null}
                    <time
                      dateTime={release.date}
                      className="text-xs text-muted-foreground"
                    >
                      {release.date}
                    </time>
                    <code className="text-[11px] text-muted-foreground">
                      {release.branch}
                    </code>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground">
                    {release.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {release.summary}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {release.highlights.map((highlight, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-sm leading-7 text-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            );
          })}
        </ol>

        <TrackedLink
          href="/knowledge"
          eventName="Changelog CTA Click"
          eventProperties={{ target: "knowledge", location: "changelog" }}
          className="group inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shinchan:shadow-sm shinchan:hover:shadow-sm"
        >
          <Trans>Open Docs workspace</Trans>
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </TrackedLink>
      </div>
    </main>
  );
}
