"use client";

import { ArrowLeft, ArrowLeftCircle, Bookmark } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { memo } from "react";
import { cn } from "@/lib/utils";
import BookModel from "./book-model";
import { hoverTransition } from "./motion-presets";
import type { Chapter } from "./types";

type ChapterSidebarProps = {
  chapters: Chapter[];
  chapterHrefBuilder?: (chapterId: string) => string;
  directoryHref: string;
};

const __ChapterSidebar: React.FC<ChapterSidebarProps> = ({
  chapters,
  directoryHref,
}) => {
  const params = useParams();
  const activeChapterId = params.chapterId as string;
  console.log("params", params);
  return (
    <aside className="relative flex flex-col gap-6 lg:w-72 shrink-0">
      <div className="absolute -left-24 top-12 hidden h-80 w-64 lg:block">
        <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-white/60 blur-2xl" />
        <div className="pointer-events-none" style={{ perspective: "1900px" }}>
          <BookModel phase="content" />
        </div>
      </div>
      <nav className="relative z-10 flex flex-col gap-2 rounded-3xl border border-slate-200/70 bg-white/80 p-6 backdrop-blur">
        <span className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
          Chapter Bookmarks
        </span>
        <div className="flex flex-col gap-2">
          {chapters.map((chapter, index) => {
            const isActive = chapter.id === activeChapterId;
            return (
              <motion.div
                key={chapter.id}
                className="group rounded-2xl"
                whileHover={isActive ? undefined : { x: 4 }}
                transition={hoverTransition}
              >
                <Link
                  href={`/chapter/${chapter.id}`}
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
              Back to Index
            </span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export const ChapterSidebar = memo(__ChapterSidebar);
