"use client";

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { ChevronDown, PenLine } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

export function ComposerDock({
  composer,
  children,
}: {
  composer: ReactNode;
  children: ReactNode;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const container = pane.current;
    const footer = dock.current;
    if (!container || !footer) return;

    const syncHeight = () => {
      container.style.setProperty(
        "--composer-dock-height",
        `${footer.offsetHeight}px`,
      );
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(footer, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pane} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
      <footer
        ref={dock}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-1 pb-4 sm:px-6 sm:pb-6"
      >
        {composer}
      </footer>
    </div>
  );
}

export function FloatingComposer({
  label,
  draft,
  forceOpen = false,
  requestOpen = 0,
  onFocusInput,
  children,
}: {
  label: string;
  draft?: string;
  forceOpen?: boolean;
  requestOpen?: number;
  onFocusInput: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusInput = useRef(onFocusInput);
  focusInput.current = onFocusInput;
  const open = expanded || forceOpen;

  useLayoutEffect(() => {
    if (!requestOpen) return;
    setExpanded(true);
    requestAnimationFrame(() => focusInput.current());
  }, [requestOpen]);

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setExpanded(next);
        if (next) requestAnimationFrame(onFocusInput);
      }}
      className={cn(
        "relative mx-auto min-h-11 w-full rounded-xl border border-border/60 bg-background/65 shadow-md transition-[max-width] duration-200 ease-out motion-reduce:transition-none pointer-events-auto backdrop-blur-md backdrop-saturate-150",
        open ? "max-w-3xl" : "max-w-sm",
      )}
    >
      <CollapsibleTrigger asChild>
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          aria-label={label}
          className={cn(
            "absolute inset-x-0 top-0 h-11 w-full min-w-0 justify-start gap-2.5 rounded-xl px-3.5 font-normal transition-opacity duration-150 motion-reduce:transition-none",
            open && "invisible pointer-events-none opacity-0",
          )}
        >
          <PenLine data-icon="inline-start" className="text-muted-foreground" />
          <span className={cn("truncate", !draft && "text-muted-foreground")}>
            {draft || label}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        variant="collapse"
        inert={!open}
        className="data-[state=open]:[&>[data-slot=collapsible-body]]:overflow-visible"
      >
        <div className="relative p-3">
          {!forceOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="收起输入框"
              title="收起输入框"
              className="absolute top-2 right-2 z-10 size-8 text-muted-foreground"
              onClick={() => {
                setExpanded(false);
                requestAnimationFrame(() =>
                  trigger.current?.focus({ preventScroll: true }),
                );
              }}
            >
              <ChevronDown />
            </Button>
          ) : null}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
