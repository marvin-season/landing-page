import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { MotionDiv, MotionP } from "@/components/ui";

const getMotionProps = (delay: number = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
});

export function Mine() {
  return (
    <div className="lg:max-w-xl mx-auto">
      <Section title="Marvin">
        <div className="text-slate-350">
          <Trans>software engineer</Trans>
        </div>
      </Section>
      <Section title="Links" delay={0.05}>
        <Nav href={"/resume"}>
          <Trans>About me in detail</Trans>
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
  title: string;
  delay?: number;
}) {
  return (
    <section className="rounded-md py-4 my-8 flex flex-col gap-3">
      <MotionP
        className="text-xl font-bold select-none"
        {...getMotionProps(delay)}
      >
        {title}
      </MotionP>
      <MotionDiv
        className="flex flex-col gap-1 text-slate-350"
        {...getMotionProps(delay + 0.05)}
      >
        {children}
      </MotionDiv>
    </section>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <MotionP className="italic" {...getMotionProps()}>
      &ldquo;{children}&rdquo;
    </MotionP>
  );
}
