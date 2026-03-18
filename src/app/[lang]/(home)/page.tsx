import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { NavCard, Quote, Section } from "./_components";

const links = [
  {
    href: "/agent",
    title: <Trans>Agent UI</Trans>,
    description: <Trans>Main chat flow powered by Mastra</Trans>,
    badge: "Core",
  },
  {
    href: "/resume",
    title: <Trans>About me in detail</Trans>,
    description: <Trans>Experience, projects, and personal profile</Trans>,
    badge: "Profile",
  },
  {
    href: "/admin/ppt",
    title: <Trans>A Simple PPT Generator</Trans>,
    description: <Trans>Generate slide content in a structured workflow</Trans>,
    badge: "Tool",
  },
  {
    href: "https://marvin-season.github.io/registry-template/",
    title: <Trans>Design System & Component Libs</Trans>,
    description: <Trans>Reusable UI components and design references</Trans>,
    badge: "External",
  },
];
export default async function Home({ params }: PageLangParam) {
  await params; // must await params to avoid lang not setup

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Section
        title={
          <div className="flex items-center gap-3">
            <span className="select-none text-2xl font-bold">Marvin</span>
            <Image
              unoptimized
              src="/avatar.gif"
              alt="Marvin"
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          </div>
        }
        className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm"
      >
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          <Trans>Software Engineer</Trans>
          <span className="mx-2">·</span>
          <Trans>
            Building practical AI products with a strong focus on iteration
            speed and developer experience.
          </Trans>
        </p>
      </Section>

      <Section title="Navigation" delay={0.05}>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((item) => (
            <NavCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
              badge={item.badge}
            />
          ))}
        </div>
      </Section>

      <Section title="Sentences" delay={0.1}>
        <Quote>
          <Trans>Leveraging less data to generate greater insights.</Trans>
        </Quote>
        <Quote>
          <Trans>
            Design is not just what it looks like. Design is how it works.
          </Trans>
        </Quote>
      </Section>
    </div>
  );
}
