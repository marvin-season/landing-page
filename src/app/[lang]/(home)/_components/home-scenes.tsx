"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { navLinks } from "../data/home-data";
import { homePreviews } from "../data/home-preview-data";
import { NavigationCarousel } from "./navigation-carousel";

export function HomeScenes({
  hero,
  quotes,
}: {
  hero: ReactNode;
  quotes: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [scene, setScene] = useState<"intro" | "transition" | "preview">(
    "intro",
  );
  const previewOpen = scene === "preview";
  const [previewRequested, setPreviewRequested] = useState(false);
  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: heroRef,
    offset: ["end end", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 170,
    damping: 30,
    mass: 0.45,
  });
  const heroOpacity = useTransform(progress, [0, 0.85], [1, 0]);
  const heroScale = useTransform(progress, [0, 1], [1, 0.94]);
  const heroY = useTransform(progress, [0, 1], [0, -36]);
  const previewOpacity = useTransform(progress, [0.2, 0.95], [0, 1]);
  const previewY = useTransform(progress, [0, 1], [48, 0]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setScene(value >= 0.98 ? "preview" : value > 0.01 ? "transition" : "intro");
    if (value <= 0.01) setPreviewRequested(false);
  });

  function scrollToScene(preview: boolean, focusContainer = false) {
    const container = containerRef.current;
    const target = preview ? previewRef.current : heroRef.current;
    if (!container || !target) return;
    setPreviewRequested(preview);
    if (focusContainer) container.focus({ preventScroll: true });
    container.scrollTo({
      top: target.offsetTop,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <main className="min-h-dvh bg-background text-foreground shinchan:bg-transparent h-dvh flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label={t`Explore the homepage`}
        className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain snap-y snap-mandatory scroll-smooth motion-reduce:scroll-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <section
          ref={heroRef}
          aria-label={t`Introduction`}
          className="flex min-h-full snap-start snap-always flex-col justify-center"
        >
          <motion.div
            style={{
              opacity: reducedMotion ? 1 : heroOpacity,
              scale: reducedMotion ? 1 : heroScale,
              y: reducedMotion ? 0 : heroY,
            }}
            className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:py-12"
          >
            {hero}
            <button
              type="button"
              onClick={() => scrollToScene(true, true)}
              className="group inline-flex w-fit items-center gap-3 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-border/70">
                <ArrowDown
                  className="size-4 motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:translate-y-1"
                  aria-hidden="true"
                />
              </span>
              <Trans>Scroll to explore the selected page</Trans>
            </button>
          </motion.div>
        </section>

        <section
          id="home-preview"
          ref={previewRef}
          aria-label={t`Page preview`}
          className="flex min-h-full snap-start snap-always flex-col justify-center"
        >
          <motion.div
            style={{
              opacity: reducedMotion ? 1 : previewOpacity,
              y: reducedMotion ? 0 : previewY,
            }}
            className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10"
          >
            <button
              type="button"
              onClick={() => scrollToScene(false, true)}
              className="inline-flex w-fit items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
              <Trans>Back to introduction</Trans>
            </button>
            {navLinks.map((item, index) => {
              const preview = homePreviews[item.analyticsId];
              const Icon = item.icon;
              const external = item.href.startsWith("http");
              const href =
                item.href === "/resume" || item.href === "/knowledge"
                  ? `/${i18n.locale}${item.href}`
                  : item.href;
              return (
                <article
                  key={item.analyticsId}
                  hidden={index !== activeIndex}
                  aria-labelledby={`preview-${item.analyticsId}`}
                >
                  <motion.div
                    key={`${item.analyticsId}-${index === activeIndex ? previewVersion : "inactive"}`}
                    initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                    animate={{
                      opacity: index === activeIndex ? 1 : 0,
                      y: reducedMotion || index === activeIndex ? 0 : 16,
                    }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16"
                  >
                    <header className="flex flex-col items-start gap-5">
                      <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {item.title}
                      </span>
                      <h2
                        id={`preview-${item.analyticsId}`}
                        className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                      >
                        {preview.title}
                      </h2>
                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                        {preview.summary}
                      </p>
                      <TrackedLink
                        href={href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noreferrer" : undefined}
                        eventName="Home Preview Open"
                        eventProperties={{
                          target: item.analyticsId,
                          href,
                          location: "home_preview",
                        }}
                        className="group inline-flex h-11 items-center gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {external ? (
                          <Trans>Open reference</Trans>
                        ) : (
                          <Trans>Open page</Trans>
                        )}
                        <ArrowRight
                          className="size-4 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </TrackedLink>
                    </header>
                    <div className="flex flex-col justify-center divide-y divide-border/60 border-y border-border/60">
                      {preview.details.map((detail, detailIndex) => (
                        <section key={detailIndex} className="py-5 sm:py-6">
                          <span
                            aria-hidden="true"
                            className="mb-2 block text-[10px] text-primary tabular-nums tracking-[0.18em]"
                          >
                            0{detailIndex + 1}
                          </span>
                          <h3 className="text-base font-medium">
                            {detail.title}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            {detail.description}
                          </p>
                        </section>
                      ))}
                    </div>
                  </motion.div>
                </article>
              );
            })}
            {quotes}
          </motion.div>
        </section>
      </div>
      <div className="z-10 shrink-0 border-t border-border/50 bg-background/85 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl shinchan:bg-background/90">
        <NavigationCarousel
          items={navLinks.map((item) => ({
            ...item,
            href:
              item.href === "/resume" || item.href === "/knowledge"
                ? `/${i18n.locale}${item.href}`
                : item.href,
          }))}
          activeIndex={activeIndex}
          previewOpen={previewOpen}
          onCenterChange={setActiveIndex}
          onPreview={(index) => {
            setActiveIndex(index);
            setPreviewVersion((version) => version + 1);
            scrollToScene(true);
          }}
          paused={previewRequested || scene !== "intro"}
        />
      </div>
    </main>
  );
}
