"use client";

import { Details, type DetailsProps } from "@landing-page/design-system";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cls } from "../../_styles/layout";

const floatingSettingsCls = cls`
  overflow-visible [&[open]]:z-40 [&>summary]:rounded-xl
  [&>[data-slot=details-content]]:max-h-(--settings-panel-height)
`;

/** Keep each panel within the settings scroller, including deep-linked entries. */
export function SettingsDetails({
  className,
  open,
  onToggle,
  onClickCapture,
  ...props
}: Omit<DetailsProps, "ref" | "mode" | "side">) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [side, setSide] = useState<"top" | "bottom">("bottom");

  const measure = useCallback(() => {
    const details = ref.current;
    const viewport = details?.closest("[data-settings-viewport]");
    const summary = details?.querySelector("summary");
    if (!details || !viewport || !summary) return;
    const bounds = viewport.getBoundingClientRect();
    const trigger = summary.getBoundingClientRect();
    const above = Math.max(0, trigger.top - Math.max(0, bounds.top) - 8);
    const below = Math.max(
      0,
      Math.min(window.innerHeight, bounds.bottom) - trigger.bottom - 8,
    );
    const nextSide = above > below ? "top" : "bottom";
    details.style.setProperty(
      "--settings-panel-height",
      `${nextSide === "top" ? above : below}px`,
    );
    setSide(nextSide);
  }, []);

  useLayoutEffect(() => {
    const details = ref.current;
    const viewport = details?.closest("[data-settings-viewport]");
    if (!details || !viewport) return;
    const update = () => {
      if (details.open) measure();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(details);
    viewport.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [measure]);

  return (
    <Details
      {...props}
      ref={ref}
      mode="floating"
      side={side}
      name="bookkeeping-settings"
      open={open}
      className={cls(className, floatingSettingsCls)}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        if (!event.defaultPrevented && !event.currentTarget.open) measure();
      }}
      onToggle={(event) => {
        if (event.currentTarget.open) measure();
        onToggle?.(event);
      }}
    />
  );
}
