import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { MotionDiv } from "@/components/ui/motion/motion-div";

const getMotionProps = (delay: number = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
});

export function Mine() {
  const links = [
    {
      href: "/agent",
      title: <Trans>Agent UI</Trans>,
      description: <Trans>Main chat flow powered by Mastra</Trans>,
      badge: "Core",
    },
    {
      href: "/agui",
      title: <Trans>CopilotKit Playground</Trans>,
      description: <Trans>Copilot runtime route for agent chat testing</Trans>,
      badge: "Copilot",
    },
    {
      href: "/agui/rxjs",
      title: <Trans>RxJS Streaming Playground</Trans>,
      description: <Trans>Manual stream parsing and tool-call rendering</Trans>,
      badge: "Stream",
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
            Building practical AI products with a strong focus on iteration speed
            and developer experience.
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

function NavCard(props: {
  href: string;
  title: React.ReactNode;
  description: React.ReactNode;
  badge: string;
}) {
  const { href, title, description, badge } = props;
  const external = href.startsWith("http");

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group rounded-xl border border-border/80 bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {badge}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}

function Section({
  children,
  title,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <section className={`mb-8 flex flex-col gap-3 rounded-md ${className ?? ""}`}>
      <MotionDiv
        className="select-none text-xl font-bold"
        {...getMotionProps(delay)}
      >
        {title}
      </MotionDiv>
      <MotionDiv
        className="flex flex-col gap-2 text-muted-foreground"
        {...getMotionProps(delay + 0.05)}
      >
        {children}
      </MotionDiv>
    </section>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <MotionDiv
      className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm italic"
      {...getMotionProps()}
    >
      &ldquo;{children}&rdquo;
    </MotionDiv>
  );
}
