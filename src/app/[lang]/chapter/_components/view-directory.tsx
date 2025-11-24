import BookClient from "@app/_components/book-client";
import Book from "@app/chapter/_components/book";
import { msg } from "@lingui/core/macro";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MotionDiv, MotionLi, MotionUl } from "@/components/ui";
import { getChapters } from "@/lib/chapters";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

type ViewDirectoryProps = {
  lang: string;
};

const ViewDirectory: React.FC<ViewDirectoryProps> = ({ lang }) => {
  const i18n = getI18nInstance(lang);
  const chapters = getChapters(i18n);
  const defaultChapterHrefBuilder = (id: string) => `/${lang}/chapter/${id}`;
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(280px,1fr)_minmax(340px,1.1fr)]">
      <div className="flex flex-col items-center gap-6 lg:items-start">
        <Link
          href={`/${lang}`}
          aria-label="Return to cover"
          className="relative flex justify-center lg:justify-start"
          style={{ perspective: "1900px" }}
        >
          <BookClient phase="content" interactive>
            <Book lang={lang} chapters={chapters} />
          </BookClient>
        </Link>
        <MotionDiv
          className="self-center rounded-full bg-primary/80 px-5 py-3 text-sm uppercase tracking-[0.28em] text-primary-foreground shadow-[0_28px_48px_-36px_var(--ring)] lg:self-start"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {i18n._(msg`Click the cover to return`)}
        </MotionDiv>
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            {i18n._(msg`Table of Contents`)}
          </span>
          <h2 className="text-balance text-3xl font-semibold text-foreground">
            {i18n._(msg`Choose the chapter you want to explore`)}
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {i18n._(
              msg`We curated four core chapters for an AI-powered content platform. Pick any chapter and the book will reveal the stories and capabilities inside.`,
            )}
          </p>
        </div>
      </div>
      <MotionUl
        className="space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {chapters.map((chapter, index) => (
          <MotionLi
            key={chapter.id}
            className="rounded-3xl border border-border/60 bg-card/80 p-6 text-foreground backdrop-blur transition-shadow hover:shadow-[0_28px_60px_-38px_var(--ring)]"
            whileHover={{ y: -4 }}
          >
            <Link
              href={defaultChapterHrefBuilder(chapter.id)}
              className="flex w-full items-start justify-between text-left"
            >
              <div className="flex flex-col gap-3 pr-6">
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {chapter.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {chapter.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapter.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          </MotionLi>
        ))}
      </MotionUl>
    </div>
  );
};

export default ViewDirectory;
