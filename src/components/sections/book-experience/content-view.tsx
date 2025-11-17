"use client";

import { BookOpen } from "lucide-react";
import AnimatedContent from "@/components/AnimatedContent";
import type { Chapter } from "./types";

type ContentViewProps = {
  activeChapter: Chapter;
};

const ContentView: React.FC<ContentViewProps> = ({ activeChapter }) => (
  <AnimatedContent
    distance={50}
    direction="horizontal"
    duration={0.3}
    ease="power3.out"
    initialOpacity={0}
    animateOpacity
    scale={0.9}
    threshold={0.2}
    delay={0.1}
  >
    <div className="flex flex-col gap-4">
      <span className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.36em] text-slate-400">
        {activeChapter.tagline}
      </span>
      <h2 className="text-balance text-4xl font-semibold text-slate-950">
        {activeChapter.title}
      </h2>
      <p className="text-base leading-relaxed text-slate-500">
        {activeChapter.content.hero}
      </p>
      <p className="text-sm leading-relaxed text-slate-500">
        {activeChapter.content.description}
      </p>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {activeChapter.content.bullets.map((bullet) => (
        <div
          key={bullet.title}
          className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase tracking-[0.32em] text-white">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {bullet.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-500">
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
          className="flex-1 min-w-[160px] rounded-3xl border border-slate-200/70 bg-slate-900 text-white"
        >
          <div className="flex flex-col gap-2 p-6">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">
              {metric.label}
            </span>
            <span className="text-3xl font-semibold leading-none">
              {metric.value}
            </span>
            <span className="text-xs uppercase tracking-[0.24em] text-white/60">
              {metric.caption}
            </span>
          </div>
        </div>
      ))}
    </div>
  </AnimatedContent>
);

export default ContentView;
