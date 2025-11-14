import { notFound } from "next/navigation";

import ChapterStage from "@/components/sections/book-experience/chapter-stage";
import { chapters } from "@/components/sections/book-experience/chapters";

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
    <div className="flex flex-1 flex-col gap-10">
      <header className="flex flex-col items-start gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.32em] text-slate-500 backdrop-blur">
          AI Content Studio
        </span>
        <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
          {activeChapter.title}
        </h1>
        <p className="max-w-2xl text-base text-slate-500">
          {activeChapter.summary}
        </p>
      </header>

      <ChapterStage
        activeChapter={activeChapter}
        chapters={chapters}
        directoryHref="/chapter"
      />
    </div>
  );
};

export default ChapterPage;
