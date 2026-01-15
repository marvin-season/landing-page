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
  return (
    <div className="lg:max-w-xl mx-auto px-6 py-10 space-y-8">
      <Section
        title={
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold select-none">Marvin</span>
            <Image
              src="/avatar.gif"
              alt="Marvin"
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          </div>
        }
      >
        <span className="text-slate-350">
          <Trans>Software Engineer</Trans>
        </span>
      </Section>
      <Section title="Links" delay={0.05}>
        <Nav href={"/chat"}>
          <Trans>Chat with me</Trans>
        </Nav>
        <Nav href={"/resume"}>
          <Trans>About me in detail</Trans>
        </Nav>
        <Nav href={"/admin/ppt"}>
          <Trans>A Simple PPT Generator</Trans>
        </Nav>
        <Nav href={"https://ds.fuelstack.icu"}>
          <Trans>Design System & Component Libs</Trans>
        </Nav>
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

function Nav({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="relative duration-500 select-none w-fit 
      after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:bg-slate-350 after:scale-x-0 after:origin-center 
      hover:after:scale-x-100 after:transition-transform"
    >
      {children}
    </Link>
  );
}

function Section({
  children,
  title,
  delay = 0,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  delay?: number;
}) {
  return (
    <section className="rounded-md flex flex-col gap-3">
      <MotionDiv
        className="text-xl font-bold select-none"
        {...getMotionProps(delay)}
      >
        {title}
      </MotionDiv>
      <MotionDiv
        className="flex flex-col gap-2 text-slate-350"
        {...getMotionProps(delay + 0.05)}
      >
        {children}
      </MotionDiv>
    </section>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <MotionDiv className="italic" {...getMotionProps()}>
      &ldquo;{children}&rdquo;
    </MotionDiv>
  );
}
