import { Press_Start_2P } from "next/font/google";
import Link from "next/link";
import { SnakeGame } from "./snake-game";

type PixelHeroProps = {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
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
  secondaryCta,
}: PixelHeroProps) {
  return (
    <section className="relative min-h-dvh overflow-hidden bg-[#020016] px-4 py-16 md:px-8">
      <PixelBackdrop />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-[32px] border border-white/15 bg-[linear-gradient(135deg,rgba(10,3,45,0.96),rgba(3,0,15,0.94))] p-8 shadow-[0_35px_70px_rgba(2,0,20,0.85)] backdrop-blur-2xl lg:flex-row lg:gap-14 lg:p-12">
        <div className="flex flex-1 flex-col justify-center gap-8 text-pretty">
          <span
            className={`${pressStart.className} inline-flex w-max items-center gap-3 rounded-sm border-2 border-white/40 bg-black/60 px-4 py-2 text-[10px] uppercase tracking-[0.4em] text-emerald-300 shadow-[4px_4px_0_rgba(0,0,0,0.85)]`}
          >
            {badge}
            <span className="h-2 w-2 animate-pulse rounded-sm bg-emerald-400" />
          </span>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base text-white/70 sm:text-lg">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            <Link
              href={primaryCta.href}
              className={`${pixelButtonBase} bg-emerald-300 text-black shadow-[6px_6px_0_rgba(0,0,0,0.8)]`}
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className={`${pixelButtonBase} border-white/50 bg-[#0E0A1A] text-white shadow-[6px_6px_0_rgba(0,0,0,0.8)]`}
            >
              {secondaryCta.label}
            </Link>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-inner shadow-black/30 backdrop-blur">
            <p className="mb-3 text-xs tracking-[0.3em] text-white/60">
              SYSTEM NOTES
            </p>
            <ul className="grid gap-2 text-sm text-white/80">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium"
                >
                  <span className="h-2 w-2 rounded-sm bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[520px]">
            <SnakeGame />
          </div>
        </div>
      </div>
    </section>
  );
}

function PixelBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(circle_at_center,rgba(4,2,22,0.95),rgba(0,0,0,1))]" />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.32),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.3),transparent_60%)] mix-blend-screen" />
      <div className="pointer-events-none absolute inset-6 -z-10 rounded-[40px] border border-white/12 bg-[linear-gradient(120deg,rgba(20,12,60,0.95),rgba(5,2,25,0.92))] shadow-[0_0_90px_rgba(45,212,191,0.25)]" />
      <div className="pointer-events-none absolute inset-0 -z-5 opacity-70 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[22px_22px]" />
    </>
  );
}
