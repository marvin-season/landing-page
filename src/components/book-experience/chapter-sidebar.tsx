"use client";

import { Trans } from "@lingui/react/macro";
import { ArrowLeft, ArrowLeftCircle, Bookmark } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MotionDiv } from "@/components/ui";
import { useChapters } from "@/hooks/use-chapters";
import { cn } from "@/lib/utils";

const ChapterSidebar: React.FC = () => {
  const params = useParams();

  const lang = params.lang as string;
  const activeChapterId = params.chapterId as string | undefined;
  const chapters = useChapters();

  if (!activeChapterId) {
    return null;
  }
  return (
    <MotionDiv>
      <aside className="relative flex flex-col gap-6 lg:w-72 shrink-0">
        <nav className="relative z-10 flex flex-col gap-2 rounded-3xl border border-sidebar-border/60 bg-sidebar/80 p-6 text-sidebar-foreground backdrop-blur">
          <span className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-sidebar-foreground/60">
            <Trans>Chapter Bookmarks</Trans>
          </span>
          <div className="flex flex-col gap-4">
            {chapters.map((chapter, index) => {
              const isActive = chapter.id === activeChapterId;
              return (
                <div key={chapter.id} className="group rounded-2xl">
                  <Link
                    href={`/${lang}/chapter/${chapter.id}`}
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
              href={`/${lang}/chapter`}
              className="flex w-full items-center justify-between rounded-2xl border border-sidebar-border/60 bg-sidebar/70 px-4 py-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar/80"
            >
              <span className="flex items-center gap-2">
                <ArrowLeftCircle className="h-4 w-4" />
                <Trans>Back to Index</Trans>
              </span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </aside>
    </MotionDiv>
  );
};

export default ChapterSidebar;
