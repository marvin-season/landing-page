import { notFound } from "next/navigation";

import { chapters } from "@/components/sections/book-experience/chapters";
import { MemoizedContentView } from "@/components/sections/book-experience/phase-content";

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

  return <MemoizedContentView activeChapter={activeChapter} />;
};

export default ChapterPage;
