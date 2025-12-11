import Link from "next/link";
import SnakeGameCanvas from "./snake-game";

type PixelHeroProps = {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  ctas: {
    label: string;
    href: string;
  }[];
};

const pixelButtonBase =
  "relative inline-flex items-center justify-center border-2 border-foreground uppercase tracking-[0.2em] text-xs font-semibold transition shadow-[4px_4px_0_var(--color-border)] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--color-border)] active:translate-y-[4px] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

export function PixelHero({
  badge,
  title,
  description,
  highlights,
  ctas,
}: PixelHeroProps) {
  return (
    <section className="relative min-h-dvh overflow-hidden bg-background px-4 py-16 md:px-8 font-mono selection:bg-primary selection:text-primary-foreground">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 border-4 border-border bg-background p-8 lg:flex-row lg:gap-14 lg:p-12 shadow-[8px_8px_0_var(--color-border)]">
        <div className="flex flex-1 flex-col justify-center gap-8 text-pretty">
          <span
            className={`inline-flex w-max items-center gap-3 border-2 border-primary bg-primary/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-foreground`}
          >
            <span className="h-2 w-2 animate-pulse bg-primary" />
            {badge}
          </span>
          <h1
            className={`text-3xl font-bold tracking-wide md:text-4xl lg:text-4xl`}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed border-l-4 border-primary pl-4">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 text-xs mt-2">
            {ctas.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className={`${pixelButtonBase} bg-primary text-primary-foreground hover:bg-primary/90 border-border`}
              >
                {cta.label}
              </Link>
            ))}
          </div>
          <div className="border-2 border-border bg-muted/20 p-6 relative">
            {/* Decorative corner squares */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-border" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-border" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-border" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-border" />

            <p
              className={`mb-4 text-xs uppercase tracking-[0.2em] text-primary font-bold`}
            >
              &gt; SYSTEM_LOGS
            </p>
            <ul className="grid gap-3 text-sm text-muted-foreground font-mono">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary" />
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
