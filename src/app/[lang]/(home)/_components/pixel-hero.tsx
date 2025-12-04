import { Press_Start_2P } from "next/font/google";
import Link from "next/link";
import SnakeGameCanvas from "./snake-game";

type PixelHeroProps = {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  primaryCta: {
    label: string;
    href: string;
  };
};

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

const pixelButtonBase =
  "relative inline-flex items-center justify-center border-2 border-l-4 border-b-4 border-black uppercase tracking-[0.2em] text-xs font-semibold transition hover:translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.85)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

export function PixelHero({
  badge,
  title,
  description,
  highlights,
  primaryCta,
}: PixelHeroProps) {
  return (
    <section className="relative min-h-dvh overflow-hidden bg-background px-4 py-16 md:px-8 font-mono">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 border-4 border-border bg-background p-8 lg:flex-row lg:gap-14 lg:p-12">
        <div className="flex flex-1 flex-col justify-center gap-8 text-pretty">
          <span
            className={`inline-flex w-max items-center gap-3 border-2 border-emerald-500/50 bg-emerald-900/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-foreground`}
          >
            <span className="h-2 w-2 animate-pulse bg-emerald-500" />
            {badge}
          </span>
          <h1 className={`text-3xl`}>
            {title}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed border-l-4 border-border pl-4">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 text-xs mt-2">
            <Link
              href={primaryCta.href}
              className={`${pixelButtonBase} bg-emerald-400 text-background hover:bg-emerald-300 border-border`}
            >
              {primaryCta.label}
            </Link>

          </div>
          <div className="border-2 border-border bg-background p-6">
            <p className={`mb-4 text-xs uppercase tracking-[0.2em] text-emerald-500/80 ${pressStart.className}`}>
              &gt; SYSTEM_LOGS
            </p>
            <ul className="grid gap-3 text-sm text-muted-foreground font-mono">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[520px]">
            <SnakeGameCanvas />
          </div>
        </div>
      </div>
    </section>
  );
}

