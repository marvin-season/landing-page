import Link from "next/link";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import { MotionSection } from "@/components/ui/motion/motion-section";

const getMotionProps = (delay: number = 0) => ({
  initial: { opacity: 0, y: 2 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export function NavCard(props: {
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
      <p className="text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

export function Section({
  children,
  title,
  delay = 0.05,
  className,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <MotionSection
      className={`mb-8 flex flex-col gap-3 rounded-md ${className ?? ""}`}
      {...getMotionProps(delay - 0.05)}
    >
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
    </MotionSection>
  );
}

export function Quote({ children }: { children: React.ReactNode }) {
  return (
    <MotionDiv
      className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm italic"
      {...getMotionProps()}
    >
      &ldquo;{children}&rdquo;
    </MotionDiv>
  );
}
