import { msg } from "@lingui/core/macro";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { KnowledgeWorkspace } from "./_components/knowledge-workspace";

const pageTitle = msg`Docs & Knowledge | Frontend Development & AI`;
const pageDescription = msg`A personal knowledge base for frontend development, AI applications, and engineering practices, with notes on React, Next.js, and building web products.`;

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
    <main className="min-h-dvh bg-background text-foreground shinchan:bg-transparent">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
        <Link
          href={`/${lang}`}
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

        <KnowledgeWorkspace />
      </div>
    </main>
  );
}
