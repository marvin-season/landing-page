"use client";
import { cn } from "@landing-page/utils";

import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const transitionMs = 260;
const EditContext = createContext<{
  selectedId: string | null;
  select: (id: string | null) => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  headerRef?: RefObject<HTMLElement | null>;
  footerRef?: RefObject<HTMLElement | null>;
} | null>(null);

export function useItemEditSelection() {
  return useContext(EditContext);
}

/** Keep the scroll position and list slots intact while one editor covers the viewport. */
export function ItemEditViewport({
  children,
  className,
  scrollClassName,
  headerRef,
  footerRef,
}: {
  children: ReactNode;
  className?: string;
  scrollClassName: string;
  headerRef?: RefObject<HTMLElement | null>;
  footerRef?: RefObject<HTMLElement | null>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedId, select] = useState<string | null>(null);
  const [present, setPresent] = useState(false);
  useLayoutEffect(() => {
    if (selectedId !== null) {
      setPresent(true);
      return;
    }
    const timer = window.setTimeout(() => setPresent(false), transitionMs + 20);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  return (
    <EditContext.Provider
      value={{ selectedId, select, viewportRef, headerRef, footerRef }}
    >
      <div
        ref={viewportRef}
        className={cn("relative min-h-0 overflow-hidden isolate", className)}
      >
        <div
          className={cn(
            scrollClassName,
            "[scrollbar-gutter:stable]",
            present ? "overflow-hidden!" : "",
          )}
          inert={present}
        >
          {children}
        </div>
      </div>
    </EditContext.Provider>
  );
}

type Geometry = {
  viewportTop: number;
  viewportBottom: number;
  top: number;
  left: number;
  width: number;
  height: number;
  expandedHeight: number;
};

/** Same placeholder + translate/height transition as OrdersList; portal avoids nested details clipping. */
export function ExpandingItemEditor({
  expanded,
  summary,
  expandedSummary,
  selected = false,
  children,
  footer,
}: {
  expanded: boolean;
  summary: ReactNode;
  expandedSummary?: ReactNode;
  selected?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const context = useItemEditSelection();
  const rowRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [raised, setRaised] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const viewport = context?.viewportRef.current;
    const header = context?.headerRef?.current;
    const footer = context?.footerRef?.current;
    if (!expanded || !row || !viewport) {
      setRaised(false);
      const timer = window.setTimeout(
        () => setGeometry(null),
        transitionMs + 20,
      );
      return () => window.clearTimeout(timer);
    }
    const measure = () => {
      const origin = row.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      const headerBounds = header?.getBoundingClientRect();
      const footerBounds = footer?.getBoundingClientRect();
      // Only cover the visible list below its header, never the controls above it.
      const viewportTop = Math.min(
        viewport.clientHeight,
        Math.max(0, (headerBounds?.bottom ?? bounds.top) - bounds.top),
      );
      const viewportBottom = Math.max(
        viewportTop,
        Math.min(
          viewport.clientHeight,
          (footerBounds?.top ?? bounds.bottom) - bounds.top,
        ),
      );
      setGeometry({
        viewportTop,
        viewportBottom: viewport.clientHeight - viewportBottom,
        top: origin.top - bounds.top - viewportTop,
        left: origin.left - bounds.left,
        width: origin.width,
        height: origin.height,
        expandedHeight: Math.max(0, viewportBottom - viewportTop - 16),
      });
    };
    measure();
    // Paint the original bounds first, then travel to the visible viewport top.
    let secondFrame = 0;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setRaised(true));
    });
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(row);
    if (header) observer.observe(header);
    if (footer) observer.observe(footer);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      observer.disconnect();
    };
  }, [expanded, context?.viewportRef, context?.headerRef, context?.footerRef]);

  // If a filtered/deleted row unmounts, release the shared editing lock.
  const select = context?.select;
  const wasExpanded = useRef(expanded);
  wasExpanded.current = expanded;
  useLayoutEffect(
    () => () => {
      if (wasExpanded.current) select?.(null);
    },
    [select],
  );

  return (
    <>
      <div ref={rowRef} className={geometry ? "opacity-0" : undefined}>
        {summary}
      </div>
      {geometry && context?.viewportRef.current
        ? createPortal(
            <div
              className="absolute inset-0 z-20 overflow-hidden"
              style={{
                top: geometry.viewportTop,
                bottom: geometry.viewportBottom,
              }}
              data-item-editor=""
            >
              <div
                className={cn(
                  "absolute inset-0 bg-card transition-opacity duration-200 motion-reduce:transition-none",
                  raised ? "opacity-100" : "opacity-0",
                )}
              />
              <div
                className={cn(
                  "absolute min-h-0 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card\n    transition-[transform,height] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]\n    motion-reduce:transition-none data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/5",
                )}
                data-selected={selected}
                style={{
                  top: geometry.top,
                  left: geometry.left,
                  width: geometry.width,
                  height: raised ? geometry.expandedHeight : geometry.height,
                  transform: raised
                    ? `translateY(${8 - geometry.top}px)`
                    : "translateY(0)",
                }}
              >
                {/* Keep the form/footer layout stable while the outer card reveals it. */}
                <div
                  className="flex min-h-0 shrink-0 flex-col"
                  style={{ height: Math.max(0, geometry.expandedHeight - 2) }}
                >
                  <div className="shrink-0 overflow-y-auto overscroll-y-contain max-h-[40%]">
                    {expandedSummary ?? summary}
                  </div>
                  <div
                    inert={!expanded}
                    className={cn(
                      "min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-t border-border/40 p-3 transition-opacity duration-200 motion-reduce:transition-none",
                      raised ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {children}
                  </div>
                  {footer ? (
                    <div
                      inert={!expanded}
                      className={cn(
                        "shrink-0 border-t border-border/40 p-3 transition-opacity duration-200 motion-reduce:transition-none",
                        raised ? "opacity-100" : "opacity-0",
                      )}
                    >
                      {footer}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            context.viewportRef.current,
          )
        : null}
    </>
  );
}
