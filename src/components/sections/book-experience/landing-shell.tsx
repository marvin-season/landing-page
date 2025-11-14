"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { chapters } from "./chapters";
import BookExperience from "./index";
import { chapterNavigationDelay } from "./motion-presets";

const LandingExperience: React.FC = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    chapters.forEach((chapter) => {
      router.prefetch(`/${chapter.id}`);
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [router]);

  const handleNavigateToChapter = (chapterId: string) => {
    if (isNavigating) return;
    setIsNavigating(true);

    timeoutRef.current = setTimeout(() => {
      router.push(`/${chapterId}`);
    }, chapterNavigationDelay);
  };

  return (
    <BookExperience
      onNavigateToChapter={handleNavigateToChapter}
      isNavigating={isNavigating}
    />
  );
};

export default LandingExperience;
