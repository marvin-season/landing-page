"use client";

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
import { cls } from "./bbq-layout";

const transitionMs = 260;
const EditContext = createContext<{
  selectedId: string | null;
  select: (id: string | null) => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  headerRef?: RefObject<HTMLDivElement | null>;
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
}: {
  children: ReactNode;
  className?: string;
  scrollClassName: string;
  headerRef?: RefObject<HTMLDivElement | null>;
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
  const viewportCls = cls`relative min-h-0 overflow-hidden isolate ${className}`;
  const scrollCls = cls`${scrollClassName} [scrollbar-gutter:stable] ${present ? "overflow-hidden!" : ""}`;

  return (
    <EditContext.Provider
      value={{ selectedId, select, viewportRef, headerRef }}
    >
      <div ref={viewportRef} className={viewportCls}>
        <div className={scrollCls} inert={present}>
          {children}
        </div>
      </div>
    </EditContext.Provider>
  );
}

type Geometry = {
  viewportTop: number;
  top: number;
  left: number;
  width: number;
  height: number;
  expandedHeight: number;
  expandedLeft: number;
  expandedWidth: number;
};

/** Same placeholder + translate/height transition as OrdersList; portal avoids nested details clipping. */
export function ExpandingItemEditor({
  expanded,
  summary,
  expandedSummary,
  children,
  footer,
}: {
  expanded: boolean;
  summary: ReactNode;
  expandedSummary?: ReactNode;
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
      // Only cover the visible list below its header, never the controls above it.
      const viewportTop = Math.min(
        viewport.clientHeight,
        Math.max(0, (headerBounds?.bottom ?? bounds.top) - bounds.top),
      );
      const expandedLeft = Math.max(
        4,
        (headerBounds?.left ?? origin.left) - bounds.left,
      );
      const expandedRight = Math.min(
        viewport.clientWidth - 4,
        (headerBounds?.right ?? origin.right) - bounds.left,
      );
      setGeometry({
        viewportTop,
        top: origin.top - bounds.top - viewportTop,
        left: origin.left - bounds.left,
        width: origin.width,
        height: origin.height,
        expandedHeight: Math.max(0, viewport.clientHeight - viewportTop - 16),
        expandedLeft,
        expandedWidth: Math.max(0, expandedRight - expandedLeft),
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
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      observer.disconnect();
    };
  }, [expanded, context?.viewportRef, context?.headerRef]);

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

  const panelCls = cls`
    absolute min-h-0 flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card
    transition-[transform,height,left,width] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]
    motion-reduce:transition-none
  `;

  return (
    <>
      <div ref={rowRef}>{summary}</div>
      {geometry && context?.viewportRef.current
        ? createPortal(
            <div
              className="absolute inset-0 z-20 overflow-hidden"
              style={{ top: geometry.viewportTop }}
              data-item-editor=""
            >
              <div
                className={cls`absolute inset-0 bg-background transition-opacity duration-200 motion-reduce:transition-none ${raised ? "opacity-100" : "opacity-0"}`}
              />
              <div
                className={panelCls}
                style={{
                  top: geometry.top,
                  left: raised ? geometry.expandedLeft : geometry.left,
                  width: raised ? geometry.expandedWidth : geometry.width,
                  height: raised ? geometry.expandedHeight : geometry.height,
                  transform: raised
                    ? `translateY(${8 - geometry.top}px)`
                    : "translateY(0)",
                }}
              >
                <div
                  className={cls`shrink-0 overflow-y-auto overscroll-y-contain ${raised ? "max-h-[40%]" : "max-h-full"}`}
                >
                  {expanded ? (expandedSummary ?? summary) : summary}
                </div>
                <div
                  inert={!expanded}
                  className={cls`min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-t border-border/40 p-3 transition-opacity duration-200 motion-reduce:transition-none ${raised ? "opacity-100" : "opacity-0"}`}
                >
                  {children}
                </div>
                {footer ? (
                  <div
                    inert={!expanded}
                    className={cls`shrink-0 border-t border-border/40 bg-card p-3 transition-opacity duration-200 motion-reduce:transition-none ${raised ? "opacity-100" : "opacity-0"}`}
                  >
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>,
            context.viewportRef.current,
          )
        : null}
    </>
  );
}
