"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type MouseEvent, useEffect, useRef } from "react";
import type { HomeNavLink } from "../data/home-data";
import { NavCard } from "./index";

export function NavigationCarousel({
  items,
  activeIndex,
  previewOpen,
  paused,
  onCenterChange,
  onPreview,
}: {
  items: HomeNavLink[];
  activeIndex: number;
  previewOpen: boolean;
  paused: boolean;
  onCenterChange: (index: number) => void;
  onPreview: (index: number) => void;
}) {
  const { t } = useLingui();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef(false);
  const stateRef = useRef({ activeIndex, paused, previewOpen, onCenterChange });
  const controllerRef = useRef<{
    center: (index: number) => void;
    interrupt: () => void;
  } | null>(null);

  useEffect(() => {
    stateRef.current = { activeIndex, paused, previewOpen, onCenterChange };
  }, [activeIndex, paused, previewOpen, onCenterChange]);

  function centerItem(index: number) {
    controllerRef.current?.center(index);
    onCenterChange(index);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !items.length) return;
    const cards = [...container.querySelectorAll<HTMLAnchorElement>("a")];
    let position = 0;
    let lastWritten = 0;
    let destination: number | null = null;
    let selectedTarget: number | null = null;
    let cycle = 0;
    let step = 0;
    let lower = 0;
    let firstCenter = 0;
    let previousTime = 0;
    let manualUntil = 0;
    let frame = 0;

    function measure() {
      step = cards[1].offsetLeft - cards[0].offsetLeft;
      cycle = cards[items.length].offsetLeft - cards[0].offsetLeft;
      firstCenter = cards[0].offsetLeft + cards[0].offsetWidth / 2;
      lower = cycle + firstCenter - container!.clientWidth / 2;
      position = lower + stateRef.current.activeIndex * step;
      destination = null;
      selectedTarget = null;
      if (Math.abs(container!.scrollLeft - position) > 0.01) {
        container!.scrollLeft = position;
      }
      lastWritten = container!.scrollLeft;
    }

    function interrupt() {
      destination = null;
      selectedTarget = null;
      manualUntil = performance.now() + 1400;
    }

    controllerRef.current = {
      center(index) {
        // Choose the nearest copy so the last/first item also moves continuously.
        const centered = lower + index * step;
        destination =
          centered + Math.round((position - centered) / cycle) * cycle;
        selectedTarget = index;
        manualUntil = performance.now() + 1400;
      },
      interrupt,
    };

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;
      event.preventDefault();
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container!.clientWidth
            : 1;
      // Accumulate wheel input into the same position used by autoplay.
      destination = (destination ?? position) + delta * unit;
      selectedTarget = null;
      manualUntil = performance.now() + 1400;
    }

    function tick(time: number) {
      const elapsed = previousTime ? Math.min(time - previousTime, 40) : 0;
      previousTime = time;
      const state = stateRef.current;
      // Touch scrolling, scrollbar movement and keyboard focus remain native.
      if (Math.abs(container!.scrollLeft - lastWritten) > 1) {
        position = container!.scrollLeft;
        interrupt();
      }
      if (destination !== null) {
        const difference = destination - position;
        position += reducedMotion
          ? difference
          : difference * (1 - Math.exp(-elapsed / 100));
        if (Math.abs(destination - position) < 0.3) {
          position = destination;
          destination = null;
          selectedTarget = null;
        }
      } else if (
        !reducedMotion &&
        !state.paused &&
        !state.previewOpen &&
        !pauseRef.current &&
        !document.hidden &&
        time >= manualUntil &&
        !container!.parentElement?.contains(document.activeElement)
      ) {
        // One complete loop in 96 seconds (the original marquee used 48).
        position += (cycle / 96000) * elapsed;
      }
      if (cycle > 0) {
        const wrapped =
          lower + ((((position - lower) % cycle) + cycle) % cycle);
        if (destination !== null) destination += wrapped - position;
        position = wrapped;
      }
      if (Math.abs(container!.scrollLeft - position) > 0.01) {
        container!.scrollLeft = position;
      }
      lastWritten = container!.scrollLeft;
      const nearest =
        ((Math.round(
          (position + container!.clientWidth / 2 - firstCenter) / step,
        ) %
          items.length) +
          items.length) %
        items.length;
      if (selectedTarget === null && nearest !== state.activeIndex) {
        state.onCenterChange(nearest);
      }
      frame = requestAnimationFrame(tick);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.addEventListener("wheel", onWheel, { passive: false });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("wheel", onWheel);
      controllerRef.current = null;
    };
  }, [items.length, reducedMotion]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>, index: number) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    if (previewOpen && activeIndex === index) return;
    event.preventDefault();
    centerItem(index);
    onPreview(index);
  }

  return (
    <nav
      aria-label={t`Navigation`}
      onPointerEnter={() => {
        pauseRef.current = true;
      }}
      onPointerLeave={() => {
        pauseRef.current = false;
      }}
      className="relative isolate mx-auto w-full max-w-7xl px-5 sm:px-8"
    >
      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-[0.18em]">
          <Trans>Navigation</Trans>
        </span>
        <div className="flex items-center gap-3">
          <span className="tabular-nums">
            0{activeIndex + 1} / 0{items.length}
          </span>
          <button
            type="button"
            aria-label={t`Previous page preview`}
            onClick={() =>
              centerItem((activeIndex - 1 + items.length) % items.length)
            }
            className="rounded-full p-1 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t`Next page preview`}
            onClick={() => centerItem((activeIndex + 1) % items.length)}
            className="rounded-full p-1 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onPointerDown={() => {
          controllerRef.current?.interrupt();
        }}
        className="relative flex gap-4 overflow-x-auto overscroll-x-contain py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[0, 1, 2].flatMap((copy) =>
          items.map((item, index) => (
            <NavCard
              key={`${copy}-${item.href}`}
              {...item}
              duplicate={copy !== 1}
              active={index === activeIndex}
              previewOpen={previewOpen}
              onClick={(event) => handleClick(event, index)}
            />
          )),
        )}
      </div>
    </nav>
  );
}
