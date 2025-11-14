import { ChapterSidebar } from "@/components/sections/book-experience/chapter-sidebar";
import { chapters } from "@/components/sections/book-experience/chapters";

export default function ChapterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      <ChapterSidebar chapters={chapters} directoryHref="/chapter" />
      {children}
    </div>
  );
}
