import type { ReactNode } from "react";
import { MotionH1 } from "@/components/ui";
import { ShimmeringText } from "@/components/ui/shadcn-io";

type SceneLayoutProps = {
  badge?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  lang?: string;
};

const SceneLayout = ({
  badge = "AI Content Studio",
  title,
  description,
  children,
  className,
}: SceneLayoutProps) => {
  return (
    <section className="z-10 h-dvh relative overflow-scroll bg-background/30 backdrop-blur-md text-foreground mx-auto w-fit max-w-6xl px-6 py-16 md:px-10">
      <MotionH1
        initial={{ opacity: 0, scale: 0.95, y: 48 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -48 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between pb-12 lg:pb-24"
      >
        <div className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.32em] text-muted-foreground backdrop-blur">
            {badge}
          </span>
          <ShimmeringText
            text={title}
            duration={1.2}
            className="text-balance text-4xl font-semibold leading-tight text-foreground sm:text-5xl"
          />
          {description ? (
            <p className="max-w-2xl text-base text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </MotionH1>
      <div className={`flex-1 ${className}`}>{children}</div>
    </section>
  );
};

export default SceneLayout;
