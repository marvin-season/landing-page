"use client";

import Link from "next/link";
import { ArrowLeft, ArrowLeftCircle, Bookmark, BookOpen } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import BookModel from "./book-model";
import {
  accentTransition,
  hoverTransition,
  sceneTransition,
} from "./motion-presets";
import type { Chapter } from "./types";

type ContentViewProps = {
  activeChapter: Chapter;
  chapters: Chapter[];
  chapterHrefBuilder?: (chapterId: string) => string;
  directoryHref: string;
};

const ContentView: React.FC<ContentViewProps> = ({
  activeChapter,
  chapters,
  chapterHrefBuilder = (id) => `/chapter/${id}`,
  directoryHref,
}) => (
  <motion.div
    className="flex flex-col gap-10 lg:flex-row"
    initial={{ opacity: 0, y: 48 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -48 }}
    transition={sceneTransition}
  >
    <aside className="relative flex flex-col gap-6 lg:w-72">
      <div className="absolute -left-24 top-12 hidden h-80 w-64 lg:block">
        <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-white/60 blur-2xl" />
        <div className="pointer-events-none" style={{ perspective: "1900px" }}>
          <BookModel phase="content" />
        </div>
      </div>
      <nav className="relative z-10 flex flex-col gap-2 rounded-3xl border border-slate-200/70 bg-white/80 p-6 backdrop-blur">
        <span className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
          章节书签
        </span>
        <div className="flex flex-col gap-2">
          {chapters.map((chapter, index) => {
            const isActive = chapter.id === activeChapter.id;
            return (
              <motion.div
                key={chapter.id}
                className="group rounded-2xl"
                whileHover={isActive ? undefined : { x: 4 }}
                transition={hoverTransition}
              >
                <Link
                  href={chapterHrefBuilder(chapter.id)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-slate-900/80 bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                      : "border-transparent bg-slate-100/70 text-slate-600 hover:border-slate-900/10 hover:bg-slate-100",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.36em]",
                        isActive ? "text-white/70" : "text-slate-400",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-white" : "text-slate-700",
                      )}
                    >
                      {chapter.title}
                    </span>
                  </div>
                  <Bookmark
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-white" : "text-slate-400",
                    )}
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>
        <div className="pt-4">
          <Link
            href={directoryHref}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-white"
          >
            <span className="flex items-center gap-2">
              <ArrowLeftCircle className="h-4 w-4" />
              返回目录
            </span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </aside>
    <motion.article
      key={activeChapter.id}
      className="flex-1 rounded-[40px] border border-slate-200/70 bg-white/80 p-8 backdrop-blur md:p-10"
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      transition={accentTransition}
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
    </motion.article>
  </motion.div>
);

export default ContentView;
