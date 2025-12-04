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
    <section className="relative min-h-dvh overflow-hidden bg-[#111] px-4 py-16 md:px-8 font-mono">
      <PixelBackdrop />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 border-4 border-white/20 bg-[#1a1a1a] p-8 shadow-[16px_16px_0_rgba(0,0,0,0.5)] lg:flex-row lg:gap-14 lg:p-12">
        {/* Decorative Corner Squares */}
        <div className="absolute -left-1 -top-1 h-4 w-4 bg-white" />
        <div className="absolute -right-1 -top-1 h-4 w-4 bg-white" />
        <div className="absolute -bottom-1 -left-1 h-4 w-4 bg-white" />
        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white" />

        <div className="flex flex-1 flex-col justify-center gap-8 text-pretty">
          <span
            className={`${pressStart.className} inline-flex w-max items-center gap-3 border-2 border-emerald-500/50 bg-emerald-900/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400 shadow-[4px_4px_0_rgba(0,0,0,0.5)]`}
          >
            <span className="h-2 w-2 animate-pulse bg-emerald-500" />
            {badge}
          </span>
          <h1 className={`text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight ${pressStart.className} leading-[1.4]`}>
            {title}
          </h1>
          <p className="max-w-2xl text-base text-white/70 sm:text-lg leading-relaxed border-l-4 border-white/10 pl-4">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 text-xs mt-2">
            <Link
              href={primaryCta.href}
              className={`${pixelButtonBase} bg-emerald-400 text-black shadow-[6px_6px_0_rgba(0,0,0,0.8)] hover:bg-emerald-300`}
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className={`${pixelButtonBase} border-white/40 bg-[#222] text-white shadow-[6px_6px_0_rgba(0,0,0,0.8)] hover:bg-[#333] hover:text-emerald-300`}
            >
              {secondaryCta.label}
            </Link>
          </div>
          <div className="border-2 border-white/10 bg-black/40 p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            <p className={`mb-4 text-xs uppercase tracking-[0.2em] text-emerald-500/80 ${pressStart.className}`}>
              &gt; SYSTEM_LOGS
            </p>
            <ul className="grid gap-3 text-sm text-white/80 font-mono">
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

function PixelBackdrop() {
  return (
    <>
      {/* Dark base background */}
      <div className="pointer-events-none absolute inset-0 -z-30 bg-[#050505]" />
      
      {/* Grid Pattern */}
      <div 
        className="pointer-events-none absolute inset-0 -z-20 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to bottom, #333 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Vignette Effect */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />
      
      {/* Retro Scanlines */}
      <div className="pointer-events-none absolute inset-0 -z-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-size-[100%_4px,3px_100%] opacity-20" />
    </>
  );
}
