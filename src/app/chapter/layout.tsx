import type { ReactNode } from "react";

import ChapterSidebar from "@/components/sections/book-experience/chapter-sidebar";
import SceneLayout from "@/components/sections/book-experience/scene-layout";

const ChapterLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SceneLayout
      title="Open the index and plan your AI content blueprint together"
      description="From workflows to insights and asset governance, we curated four core chapters for AI-powered content teams. Choose one to dive deeper."
      className="flex flex-col gap-10 lg:flex-row"
    >
      <ChapterSidebar />
      <div className="flex-1 w-0">{children}</div>
    </SceneLayout>
  );
};

export default ChapterLayout;
