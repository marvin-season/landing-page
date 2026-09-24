import { msg } from "@lingui/core/macro";
import { ArrowLeft, BookOpen, FileText, Quote, ScanText } from "lucide-react";
import type { Metadata } from "next";
import { Link } from "@/components/link/link";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { KnowledgeScenes } from "./_components/knowledge-scenes";

const pageTitle = msg`Docs & Knowledge`;
const pageDescription = msg`Read PDF and Markdown documents without an account. Select passages, collect quotes with page references, and return to highlighted PDF text in a dedicated document workspace.`;

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  const title = i18n._(pageTitle);
  const description = i18n._(pageDescription);

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function KnowledgePage({ params }: PageLangParam) {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);

  return (
    <KnowledgeScenes
      overview={
        <>
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {i18n._(msg`Back to home`)}
          </Link>

          <header className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
              {i18n._(msg`Docs`)}
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              {i18n._(msg`Docs & Knowledge`)}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {i18n._(
                msg`Read, explore, and ask questions. Your documents and ideas, side by side.`,
              )}
            </p>
          </header>

          <section
            className="grid gap-5 border-t border-border/60 pt-8 sm:grid-cols-3 sm:gap-8"
            aria-label={i18n._(msg`Read and explore documents`)}
          >
            <article className="space-y-3">
              <FileText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-medium">
                {i18n._(msg`Read PDF and Markdown files`)}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {i18n._(
                  msg`Open a PDF or Markdown document without an account. Browse PDF pages, adjust the zoom, or read formatted Markdown in one workspace.`,
                )}
              </p>
            </article>
            <article className="space-y-3">
              <Quote className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-medium">
                {i18n._(msg`Keep the passages that matter`)}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {i18n._(
                  msg`Select a passage and add it to your conversation as a quote. Keep the document name and page number alongside your questions and notes.`,
                )}
              </p>
            </article>
            <article className="space-y-3">
              <ScanText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-medium">
                {i18n._(msg`Find every quote in context`)}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {i18n._(
                  msg`Click a PDF quote to return to its page and highlight the original passage. Read surrounding paragraphs without losing your place in the conversation.`,
                )}
              </p>
            </article>
          </section>
          <p className="max-w-3xl text-xs leading-6 text-muted-foreground">
            {i18n._(
              msg`Try the included sample or open your own file. Documents and notes stay in the current page session; AI replies and scanned-document OCR are not available yet.`,
            )}
          </p>
        </>
      }
    />
  );
}
