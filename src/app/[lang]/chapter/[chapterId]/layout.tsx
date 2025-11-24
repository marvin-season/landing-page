import { msg } from "@lingui/core/macro";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

export default async function ChapterLayout({
  children,
  params,
}: { children: ReactNode } & PageLangParam) {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/${lang}/chapter`}
        className="flex items-center gap-4 hover:underline"
      >
        <ArrowLeft className="size-6" />
        <h1 className=" text-4xl font-bold">
          {i18n._(msg`Back to table of contents`)}
        </h1>
      </Link>
      {children}
    </div>
  );
}
