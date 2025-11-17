import type { ReactNode } from "react";
import { ShimmeringText } from "@/components/ui/shadcn-io";
import BackgroundDecor from "./background-decor";

type SceneLayoutProps = {
  badge?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const SceneLayout = ({
  badge = "AI Content Studio",
  title,
  description,
  children,
  className,
}: SceneLayoutProps) => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <BackgroundDecor />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
        <header className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.32em] text-slate-500 backdrop-blur">
            {badge}
          </span>
          <ShimmeringText
            text={title}
            duration={1.2}
            className="text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl"
          />
          {description ? (
            <p className="max-w-2xl text-base text-slate-500">{description}</p>
          ) : null}
        </header>
        <div className={`mt-24 flex-1 ${className}`}>{children}</div>
      </div>
    </section>
  );
};

export default SceneLayout;
