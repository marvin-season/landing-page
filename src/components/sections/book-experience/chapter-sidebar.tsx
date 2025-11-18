"use client";

import { ArrowLeft, ArrowLeftCircle, Bookmark } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AnimatedContent from "@/components/AnimatedContent";
import { chapters } from "@/components/sections/book-experience/chapters";
import { cn } from "@/lib/utils";
import BookModel from "./book-model";

const ChapterSidebar: React.FC = () => {
  const params = useParams();
  const activeChapterId = params.chapterId as string | undefined;

  if (!activeChapterId) {
    return null;
  }
  return (
    <AnimatedContent
      distance={0}
      direction="horizontal"
      reverse={false}
      duration={0.3}
      ease="power3.out"
      initialOpacity={0}
      animateOpacity
      scale={0.95}
      threshold={0}
      delay={0}
    >
      <aside className="relative flex flex-col gap-6 lg:w-72 shrink-0">
        <div className="absolute -left-24 top-12 hidden h-80 w-64 lg:block">
          <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-sidebar/60 blur-2xl" />
          <div
            className="pointer-events-none"
            style={{ perspective: "1900px" }}
          >
            <BookModel phase="content" />
          </div>
        </div>
        <nav className="relative z-10 flex flex-col gap-2 rounded-3xl border border-sidebar-border/60 bg-sidebar/80 p-6 text-sidebar-foreground backdrop-blur">
          <span className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-sidebar-foreground/60">
            Chapter Bookmarks
          </span>
          <div className="flex flex-col gap-4">
            {chapters.map((chapter, index) => {
              const isActive = chapter.id === activeChapterId;
              return (
                <div key={chapter.id} className="group rounded-2xl">
                  <Link
                    href={`/chapter/${chapter.id}`}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-sidebar-primary/70 bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_18px_40px_-20px_var(--sidebar-ring)]"
                        : "border-transparent bg-sidebar-accent/80 text-sidebar-foreground/80 hover:border-sidebar-ring/40 hover:bg-sidebar-accent/90",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.36em]",
                          isActive
                            ? "text-sidebar-primary-foreground/70"
                            : "text-sidebar-foreground/50",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground",
                        )}
                      >
                        {chapter.title}
                      </span>
                    </div>
                    <Bookmark
                      className={cn(
                        "h-4 w-4 transition-colors shrink-0",
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/50",
                      )}
                    />
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="pt-4">
            <Link
              href={"/chapter"}
              className="flex w-full items-center justify-between rounded-2xl border border-sidebar-border/60 bg-sidebar/70 px-4 py-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar/80"
            >
              <span className="flex items-center gap-2">
                <ArrowLeftCircle className="h-4 w-4" />
                Back to Index
              </span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </aside>
    </AnimatedContent>
  );
};

export default ChapterSidebar;
