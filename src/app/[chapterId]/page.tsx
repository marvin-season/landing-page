import { notFound } from "next/navigation";

import ChapterExperience from "@/components/sections/book-experience/chapter-shell";
import { chapters } from "@/components/sections/book-experience/chapters";

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

export function generateStaticParams() {
  return chapters.map((chapter) => ({ chapterId: chapter.id }));
}

const ChapterPage = async ({ params }: ChapterPageProps) => {
  const { chapterId } = await params;
  const chapterExists = chapters.some((chapter) => chapter.id === chapterId);

  if (!chapterExists) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <ChapterExperience chapterId={chapterId} />
    </div>
  );
};

export default ChapterPage;
