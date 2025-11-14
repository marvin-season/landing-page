"use client";

import { AnimatePresence, motion } from "motion/react";
import { easingCurve } from "@/components/sections/book-experience/motion-presets";
import ContentView, {
  ChapterSidebar,
} from "@/components/sections/book-experience/phase-content";
import type { Chapter } from "@/components/sections/book-experience/types";

type ChapterStageProps = {
  activeChapter: Chapter;
  chapters: Chapter[];
  directoryHref: string;
  chapterHrefBuilder?: (chapterId: string) => string;
};

const ChapterStage: React.FC<ChapterStageProps> = ({
  activeChapter,
  chapters,
  directoryHref,
  chapterHrefBuilder,
}) => {
  return (
    <motion.div
      className="flex flex-col gap-10 lg:flex-row"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -32 }}
      transition={{ duration: 0.35, ease: easingCurve }}
    >
      <ChapterSidebar
        activeChapterId={activeChapter.id}
        chapters={chapters}
        chapterHrefBuilder={chapterHrefBuilder}
        directoryHref={directoryHref}
      />
      <AnimatePresence mode="wait" initial={false}>
        <ContentView key={activeChapter.id} activeChapter={activeChapter} />
      </AnimatePresence>
    </motion.div>
  );
};

export default ChapterStage;
