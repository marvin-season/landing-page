"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import BookModel from "./book-model";
import {
  accentTransition,
  hoverTransition,
  sceneTransition,
} from "./motion-presets";
import type { Chapter, Phase } from "./types";

type DirectoryViewProps = {
  phase?: Phase;
  chapters: Chapter[];
  coverHref: string;
  chapterHrefBuilder?: (chapterId: string) => string;
};

const DirectoryView: React.FC<DirectoryViewProps> = ({
  phase = "directory",
  chapters,
  coverHref,
  chapterHrefBuilder = (id) => `/chapter/${id}`,
}) => {
  return (
    <motion.div
      className="grid gap-12 lg:grid-cols-[minmax(280px,1fr)_minmax(340px,1.1fr)]"
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -48 }}
      transition={sceneTransition}
    >
      <div className="flex flex-col items-center gap-6 lg:items-start">
        <Link
          href={coverHref}
          aria-label="Return to cover"
          className="relative flex justify-center lg:justify-start"
          style={{ perspective: "1900px" }}
        >
          <BookModel phase={phase} interactive />
        </Link>
        <motion.div
          className="self-center rounded-full bg-primary/80 px-5 py-3 text-sm uppercase tracking-[0.28em] text-primary-foreground shadow-[0_28px_48px_-36px_var(--ring)] lg:self-start"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...hoverTransition, delay: 0.4 }}
        >
          Click the cover to return
        </motion.div>
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            Table of Contents
          </span>
          <h2 className="text-balance text-3xl font-semibold text-foreground">
            Choose the chapter you want to explore
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            We curated four core chapters for an AI-powered content platform.
            Pick any chapter and the book will reveal the stories and
            capabilities inside.
          </p>
        </div>
      </div>

      <motion.ul
        className="space-y-4"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...accentTransition, delay: 0.2 }}
      >
        {chapters.map((chapter, index) => (
          <motion.li
            key={chapter.id}
            className="rounded-3xl border border-border/60 bg-card/80 p-6 text-foreground backdrop-blur transition-shadow hover:shadow-[0_28px_60px_-38px_var(--ring)]"
            whileHover={{ y: -4 }}
            transition={hoverTransition}
          >
            <Link
              href={chapterHrefBuilder(chapter.id)}
              className="flex w-full items-start justify-between text-left"
            >
              <div className="flex flex-col gap-3 pr-6">
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground/70">
                  Chapter {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {chapter.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {chapter.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapter.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
};

export default DirectoryView;
