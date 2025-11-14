import { chapters } from "@/components/sections/book-experience/chapters";
import DirectoryView from "@/components/sections/book-experience/phase-directory";
import SceneLayout from "@/components/sections/book-experience/scene-layout";

const ChapterDirectoryPage = () => {
  return (
    <SceneLayout
      title="Open the index and plan your AI content blueprint together"
      description="From workflows to insights and asset governance, we curated four core chapters for AI-powered content teams. Choose one to dive deeper."
    >
      <DirectoryView chapters={chapters} coverHref="/" />
    </SceneLayout>
  );
};

export default ChapterDirectoryPage;
