"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import BookModel from "./book-model";
import {
  accentTransition,
  hoverTransition,
  sceneTransition,
} from "./motion-presets";
import type { Chapter, Phase } from "./types";

type DirectoryViewProps = {
  phase: Phase;
  chapters: Chapter[];
  onBackToCover: () => void;
  onSelectChapter: (chapterId: string) => void;
  disabled?: boolean;
};

const DirectoryView: React.FC<DirectoryViewProps> = ({
  phase,
  chapters,
  onBackToCover,
  onSelectChapter,
  disabled,
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
        <div
          className="relative flex justify-center lg:justify-start"
          style={{ perspective: "1900px" }}
        >
          <BookModel
            phase={phase}
            interactive={!disabled}
            onClick={onBackToCover}
            label="关闭回到封面"
          />
          <motion.div
            className="absolute -bottom-10 right-4 rounded-full bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white shadow-lg shadow-slate-900/30"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...hoverTransition, delay: 0.4 }}
          >
            点击封面返回
          </motion.div>
        </div>
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            目录
          </span>
          <h2 className="text-balance text-3xl font-semibold text-slate-950">
            选择你想深入的章节
          </h2>
          <p className="mt-3 max-w-sm text-sm text-slate-500">
            我们为 AI
            驱动的内容平台整理了四个核心章节。选择任意章节，书本会为你展开相应的故事与能力。
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
            className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 backdrop-blur transition-shadow hover:shadow-xl hover:shadow-slate-900/10"
            whileHover={disabled ? undefined : { y: -4 }}
            transition={hoverTransition}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectChapter(chapter.id)}
              className="flex w-full items-start justify-between text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex flex-col gap-3 pr-6">
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                  Chapter {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {chapter.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {chapter.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapter.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-slate-200/60 bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-500 backdrop-blur"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/60 bg-slate-100/50">
                <ArrowRight className="h-5 w-5 text-slate-500" />
              </div>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
};

export default DirectoryView;
