import type { ReactNode } from "react";

import SceneLayout from "@/components/sections/book-experience/scene-layout";

const ChapterLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SceneLayout
      title="Open the index and plan your AI content blueprint together"
      description="From workflows to insights and asset governance, we curated four core chapters for AI-powered content teams. Choose one to dive deeper."
    >
      {children}
    </SceneLayout>
  );
};

export default ChapterLayout;
