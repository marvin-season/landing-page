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
  /** 正在展开并迁移焦点时忽略短暂 blur，避免点开后立刻被收起。 */
  const opening = useRef(false);
  const focusInput = useRef(onFocusInput);
  focusInput.current = onFocusInput;
  const open = expanded || forceOpen;

  const expand = useCallback((andFocus: boolean) => {
    opening.current = true;
    setExpanded(true);
    requestAnimationFrame(() => {
      if (andFocus) focusInput.current();
      // 再等一帧，等触发器失焦、输入框获得焦点都落定后再允许失焦收起。
      requestAnimationFrame(() => {
        opening.current = false;
      });
    });
  }, []);

  useLayoutEffect(() => {
    if (!requestOpen) return;
    expand(true);
  }, [expand, requestOpen]);

  useLayoutEffect(() => {
    if (!expandRequest) return;
    expand(false);
  }, [expand, expandRequest]);

  useEffect(() => {
    if (!open || forceOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.current?.contains(target)) return;
      setExpanded(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [forceOpen, open]);

  function collapseOnBlur(event: FocusEvent<HTMLDivElement>) {
    if (forceOpen || opening.current) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    requestAnimationFrame(() => {
      if (forceOpen || opening.current) return;
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
          if (next) {
            expand(true);
            return;
          }
          if (forceOpen) return;
          setExpanded(false);
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
