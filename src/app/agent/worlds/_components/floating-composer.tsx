"use client";

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { PenLine } from "lucide-react";
import {
  type FocusEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function ComposerDock({
  composer,
  children,
}: {
  composer: ReactNode;
  children: ReactNode;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const [dockNode, setDockNode] = useState<HTMLElement | null>(null);
  const setDock = useCallback((footer: HTMLElement | null) => {
    setDockNode(footer);
  }, []);

  useLayoutEffect(() => {
    const container = pane.current;
    if (!container || !dockNode) return;

    const syncHeight = () => {
      container.style.setProperty(
        "--composer-dock-height",
        `${dockNode.offsetHeight}px`,
      );
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(dockNode, { box: "border-box" });
    return () => observer.disconnect();
  }, [dockNode]);

  return (
    <div ref={pane} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
      {composer ? (
        <footer
          ref={setDock}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-1 pb-4 sm:px-6 sm:pb-6"
        >
          {composer}
        </footer>
      ) : null}
    </div>
  );
}

export function FloatingComposer({
  label,
  draft,
  forceOpen = false,
  requestOpen = 0,
  expandRequest = 0,
  onFocusInput,
  children,
}: {
  label: string;
  draft?: string;
  forceOpen?: boolean;
  requestOpen?: number;
  /** Opens the composer without moving focus, so a text selection can stay put. */
  expandRequest?: number;
  onFocusInput: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const focusInput = useRef(onFocusInput);
  focusInput.current = onFocusInput;
  const open = expanded || forceOpen;

  useLayoutEffect(() => {
    if (!requestOpen) return;
    setExpanded(true);
    requestAnimationFrame(() => focusInput.current());
  }, [requestOpen]);

  useLayoutEffect(() => {
    if (!expandRequest) return;
    setExpanded(true);
  }, [expandRequest]);

  useEffect(() => {
    if (!open || forceOpen) return;

    function collapseIfOutside(target: EventTarget | null) {
      if (!(target instanceof Node)) {
        setExpanded(false);
        return;
      }
      if (root.current?.contains(target)) return;
      setExpanded(false);
    }

    function onPointerDown(event: PointerEvent) {
      collapseIfOutside(event.target);
    }

    function onFocusIn(event: Event) {
      collapseIfOutside(event.target);
    }

    // 捕获阶段：点页面其它区域或焦点挪出时收起；点内部控件不收。
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [forceOpen, open]);

  function collapseOnBlur(event: FocusEvent<HTMLDivElement>) {
    if (forceOpen) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    // relatedTarget 常为 null（点到不可聚焦区域）；延后确认，避免点内部按钮时误收。
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof Node && root.current?.contains(active)) return;
      setExpanded(false);
    });
  }

  return (
    <div ref={root} onBlur={collapseOnBlur}>
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
            type="button"
            variant="ghost"
            aria-label={label}
            className={cn(
              "absolute inset-x-0 top-0 h-11 w-full min-w-0 justify-start gap-2.5 rounded-xl px-3.5 font-normal transition-opacity duration-150 motion-reduce:transition-none",
              open && "invisible pointer-events-none opacity-0",
            )}
          >
            <PenLine
              data-icon="inline-start"
              className="text-muted-foreground"
            />
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
          <div className="relative flex flex-col gap-2 p-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
