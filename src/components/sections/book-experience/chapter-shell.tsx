"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { chapters } from "./chapters";
import BookExperience from "./index";
import { chapterNavigationDelay } from "./motion-presets";

interface ChapterExperienceProps {
  chapterId: string;
}

const ChapterExperience: React.FC<ChapterExperienceProps> = ({ chapterId }) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    chapters.forEach((chapter) => {
      if (chapter.id !== chapterId) {
        router.prefetch(`/${chapter.id}`);
      }
    });
    router.prefetch("/");
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router, chapterId]);

  const scheduleNavigation = (path: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      router.push(path);
    }, chapterNavigationDelay);
  };

  const handleNavigateToChapter = (targetId: string) => {
    if (isNavigating || targetId === chapterId) return;
    setIsNavigating(true);
    scheduleNavigation(`/${targetId}`);
  };

  const handleNavigateToDirectory = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    scheduleNavigation("/");
  };

  return (
    <BookExperience
      initialPhase="content"
      initialChapterId={chapterId}
      onNavigateToChapter={handleNavigateToChapter}
      onNavigateToDirectory={handleNavigateToDirectory}
      isNavigating={isNavigating}
    />
  );
};

export default ChapterExperience;
