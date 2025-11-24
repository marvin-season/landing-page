"use client";

import { BookOpen, LinkIcon } from "lucide-react";
import Link from "next/link";
import AnimatedContent from "@/components/ui/react-bits/animated-content";
import type { Chapter } from "@/types/chapter";

type ContentViewProps = {
  activeChapter: Chapter;
};

const ContentView: React.FC<ContentViewProps> = ({ activeChapter }) => (
  <AnimatedContent
    distance={0}
    direction="horizontal"
    duration={0.3}
    ease=""
    initialOpacity={0}
    animateOpacity
    scale={0.95}
    threshold={0}
    delay={0}
  >
    <div className="flex flex-col gap-4">
      <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.36em] text-muted-foreground/70">
        {activeChapter.tagline}
      </span>

      <h2 className="text-balance text-4xl font-semibold text-foreground">
        {activeChapter.link ? (
          <Link
            href={activeChapter.link}
            target="_blank"
            rel="noreferrer"
            prefetch={false}
            className="group inline-flex items-center gap-3 transition-all hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {activeChapter.title}
            <LinkIcon className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5" />
          </Link>
        ) : (
          activeChapter.title
        )}
      </h2>

      <p className="text-base leading-relaxed text-muted-foreground">
        {activeChapter.content.hero}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {activeChapter.content.description}
      </p>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {activeChapter.content.bullets.map((bullet) => (
        <div
          key={bullet.title}
          className="rounded-3xl border border-border/70 bg-card/70 p-6 text-foreground backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase tracking-[0.32em] text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {bullet.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {bullet.body}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-10 flex flex-wrap gap-6">
      {activeChapter.content.metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex-1 min-w-[160px] rounded-3xl border border-border/70 bg-primary text-primary-foreground"
        >
          <div className="flex flex-col gap-2 p-6">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-primary-foreground/60">
              {metric.label}
            </span>
            <span className="text-3xl font-semibold leading-none">
              {metric.value}
            </span>
            <span className="text-xs uppercase tracking-[0.24em] text-primary-foreground/70">
              {metric.caption}
            </span>
          </div>
        </div>
      ))}
    </div>
  </AnimatedContent>
);

export default ContentView;
