import { chapters } from "@/components/sections/book-experience/chapters";
import DirectoryView from "@/components/sections/book-experience/phase-directory";

const ChapterDirectoryPage = () => {
  return (
    <div className="flex flex-1 flex-col gap-10">
      <header className="flex flex-col items-start gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.32em] text-slate-500 backdrop-blur">
          AI Content Studio
        </span>
        <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
          Open the index and plan your AI content blueprint together
        </h1>
        <p className="max-w-2xl text-base text-slate-500">
          From workflows to insights and asset governance, we curated four core
          chapters for AI-powered content teams. Choose one to dive deeper.
        </p>
      </header>

      <DirectoryView chapters={chapters} coverHref="/" />
    </div>
  );
};

export default ChapterDirectoryPage;
