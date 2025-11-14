"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import BackgroundDecor from "./background-decor";
import { chapters } from "./chapters";
import ClosedView from "./phase-closed";
import ContentView from "./phase-content";
import DirectoryView from "./phase-directory";
import type { Chapter, Phase } from "./types";

interface BookExperienceProps {
  initialPhase?: Phase;
  initialChapterId?: string;
  onNavigateToChapter?: (chapterId: string) => void;
  onNavigateToDirectory?: () => void;
  isNavigating?: boolean;
}

const BookExperience: React.FC<BookExperienceProps> = ({
  initialPhase,
  initialChapterId,
  onNavigateToChapter,
  onNavigateToDirectory,
  isNavigating = false,
}) => {
  const [phase, setPhase] = useState<Phase>(initialPhase ?? "closed");
  const [activeChapterId, setActiveChapterId] = useState<string>(
    initialChapterId ?? chapters[0].id,
  );

  useEffect(() => {
    if (initialPhase) setPhase(initialPhase);
  }, [initialPhase]);

  useEffect(() => {
    if (initialChapterId) setActiveChapterId(initialChapterId);
  }, [initialChapterId]);

  const activeChapter: Chapter = useMemo(
    () =>
      chapters.find((chapter) => chapter.id === activeChapterId) ?? chapters[0],
    [activeChapterId],
  );

  const handleOpenDirectory = () => setPhase("directory");
  const handleBackToCover = () => setPhase("closed");
  const handleSelectChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setPhase("content");
    onNavigateToChapter?.(chapterId);
  };
  const handleReturnToDirectory = () => {
    setPhase("directory");
    onNavigateToDirectory?.();
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <BackgroundDecor />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
        <header className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.32em] text-slate-500 backdrop-blur">
            AI 内容工作室
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            以「书」为界面，进入下一代 AI 内容协作平台
          </h1>
          <p className="max-w-2xl text-base text-slate-500">
            我们把平台体验设计成一本会呼吸的书。翻开它，思考、创作、洞察与治理的章节将在你指尖展开。
          </p>
        </header>

        <div className="mt-12 flex-1">
          <AnimatePresence mode="wait">
            {phase === "closed" && (
              <ClosedView
                phase={phase}
                onOpenDirectory={handleOpenDirectory}
                disabled={isNavigating}
              />
            )}
            {phase === "directory" && (
              <DirectoryView
                phase={phase}
                chapters={chapters}
                onBackToCover={handleBackToCover}
                onSelectChapter={handleSelectChapter}
                disabled={isNavigating}
              />
            )}
            {phase === "content" && (
              <ContentView
                activeChapter={activeChapter}
                chapters={chapters}
                onSelectChapter={handleSelectChapter}
                onBackToDirectory={handleReturnToDirectory}
                disabled={isNavigating}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        key={isNavigating ? "progress" : "idle"}
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: isNavigating ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isNavigating && (
          <motion.span
            className="block h-full w-full bg-slate-900/70"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            style={{ transformOrigin: "0% 50%" }}
          />
        )}
      </motion.div>
    </section>
  );
};

export default BookExperience;
