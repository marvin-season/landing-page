import SceneLayout from "@app/_components/scene-layout";
import { msg } from "@lingui/core/macro";
import type { PropsWithChildren } from "react";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";

export async function generateMetadata(props: PageLangParam) {
  const i18n = getI18nInstance((await props.params).lang);

  return {
    title: i18n._(msg`Resume`),
    description: i18n._(msg`My professional experience and skills`),
  };
}

export default async function ResumeLayout({
  children,
  params,
}: PropsWithChildren<PageLangParam>) {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);
  return (
    <SceneLayout
      lang={lang}
      badge="Resume"
      title={i18n._(msg`Professional Experience & Skills`)}
      description={i18n._(
        msg`A comprehensive overview of my work experience, projects, and technical expertise.`,
      )}
      className="flex flex-col gap-10"
    >
      {children}
    </SceneLayout>
  );
}
