"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { type ReactNode, useEffect } from "react";

export function NavigationCarouselViewport({
  children,
  itemCount,
}: {
  children: ReactNode;
  itemCount: number;
}) {
  const [viewportRef, carousel] = useEmblaCarousel(
    { align: "start", loop: true, dragFree: true },
    [
      AutoScroll({
        // Match the original 48-second lap: each card is 256px + a 16px gap.
        speed: (itemCount * 272) / (48 * 60),
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
        breakpoints: { "(prefers-reduced-motion: reduce)": { active: false } },
      }),
      WheelGesturesPlugin(),
    ],
  );

  useEffect(() => {
    if (!carousel) return;

    const viewport = carousel.rootNode();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;

    const syncPlayback = () => {
      if (disposed) return;
      const autoScroll = carousel.plugins().autoScroll;
      if (
        document.hidden ||
        reducedMotion.matches ||
        viewport.matches(":hover, :focus-within")
      ) {
        autoScroll.stop();
      } else {
        autoScroll.play();
      }
    };
    // The plugin resumes hover and focus independently. Recheck both after its
    // play event so leaving with the mouse cannot restart a keyboard-focused card.
    const scheduleSync = () => queueMicrotask(syncPlayback);

    carousel.on("autoScroll:play", scheduleSync).on("reInit", syncPlayback);
    viewport.addEventListener("focusin", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      disposed = true;
      carousel.off("autoScroll:play", scheduleSync).off("reInit", syncPlayback);
      viewport.removeEventListener("focusin", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [carousel]);

  return (
    <div className="relative isolate">
      <div
        ref={viewportRef}
        className="group/navigation -mx-2 overflow-hidden px-2 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex touch-pan-y touch-pinch-zoom">{children}</div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-2 z-20 w-8 bg-background/60 backdrop-blur-md mask-[linear-gradient(to_right,black,transparent)] sm:w-16"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -right-2 z-20 w-8 bg-background/60 backdrop-blur-md mask-[linear-gradient(to_left,black,transparent)] sm:w-16"
      />
    </div>
  );
}
