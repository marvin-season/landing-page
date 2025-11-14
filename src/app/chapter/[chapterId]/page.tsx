import { notFound } from "next/navigation";
import { chapters } from "@/components/sections/book-experience/chapters";
import ContentView from "@/components/sections/book-experience/phase-content";
import SceneLayout from "@/components/sections/book-experience/scene-layout";

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

export function generateStaticParams() {
  return chapters.map((chapter) => ({ chapterId: chapter.id }));
}

const ChapterPage = async ({ params }: ChapterPageProps) => {
  const { chapterId } = await params;
  const activeChapter = chapters.find((chapter) => chapter.id === chapterId);

  if (!activeChapter) {
    notFound();
  }

  return (
    <SceneLayout
      title={activeChapter.title}
      description={activeChapter.summary}
    >
      <ContentView
        activeChapter={activeChapter}
        chapters={chapters}
        directoryHref="/chapter"
      />
    </SceneLayout>
  );
};

export default ChapterPage;
