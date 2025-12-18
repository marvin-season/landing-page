"use client";

import type { ComponentPropsWithoutRef, Ref } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";

type ScrollAreaProps = Omit<ComponentPropsWithoutRef<"div">, "ref"> & {
  /**
   * React 19: ref 作为普通 props 传入（替代 forwardRef）
   */
  ref?: Ref<HTMLDivElement>;
  /**
   * 在“到顶”状态下继续上滑/滚动时触发（等同 usePageWheel 的 onScrollUp）
   */
  onScrollUp?: () => void;
  /**
   * 在“到底”状态下继续下滑/滚动时触发（等同 usePageWheel 的 onScrollDown）
   */
  onScrollDown?: () => void;
  /**
   * 触发节流间隔，默认 200ms（与 usePageWheel 保持一致）
   */
  throttleMs?: number;
};

export function ScrollArea({
  className,
  children,
  onScrollUp,
  onScrollDown,
  throttleMs = 200,
  ref,
  ...props
}: ScrollAreaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rootEl, setRootEl] = useState<Element | null>(null);

  const isAtTopRef = useRef(false);
  const isAtBottomRef = useRef(false);
  const lastActionTimeRef = useRef(0);

  const touchStartYRef = useRef<number | null>(null);
  const touchThresholdPx = 12;

  useEffect(() => {
    setRootEl(containerRef.current);
  }, []);

  const tryFire = useCallback(
    (direction: "up" | "down") => {
      const now = Date.now();
      if (now - lastActionTimeRef.current < throttleMs) return;

      if (direction === "up") {
        onScrollUp?.();
      } else {
        onScrollDown?.();
      }

      lastActionTimeRef.current = now;
    },
    [onScrollDown, onScrollUp, throttleMs],
  );

  const { ref: topSentinelRef } = useIntersectionObserver<HTMLDivElement>({
    root: rootEl,
    threshold: 1,
    onChange: (entry) => {
      isAtTopRef.current = entry.isIntersecting;
    },
  });

  const { ref: bottomSentinelRef } = useIntersectionObserver<HTMLDivElement>({
    root: rootEl,
    threshold: 1,
    onChange: (entry) => {
      isAtBottomRef.current = entry.isIntersecting;
    },
  });

  return (
    <div
      {...props}
      ref={(node) => {
        containerRef.current = node;
        setRootEl(node);

        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      onWheel={(e) => {
        props.onWheel?.(e);
        if (e.defaultPrevented) return;

        if (e.deltaY < 0 && isAtTopRef.current) {
          tryFire("up");
        } else if (e.deltaY > 0 && isAtBottomRef.current) {
          tryFire("down");
        }
      }}
      onTouchStart={(e) => {
        props.onTouchStart?.(e);
        touchStartYRef.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        props.onTouchMove?.(e);

        const startY = touchStartYRef.current;
        const currentY = e.touches[0]?.clientY;
        if (startY == null || currentY == null) return;

        const delta = currentY - startY;
        if (Math.abs(delta) < touchThresholdPx) return;

        // 手指向下移动 => 内容尝试向下拉 => 视为“继续上滑/滚动”(上一页)
        if (delta > 0 && isAtTopRef.current) {
          tryFire("up");
          touchStartYRef.current = currentY;
          return;
        }

        // 手指向上移动 => 内容尝试向上推 => 视为“继续下滑/滚动”(下一页)
        if (delta < 0 && isAtBottomRef.current) {
          tryFire("down");
          touchStartYRef.current = currentY;
        }
      }}
      onTouchEnd={(e) => {
        props.onTouchEnd?.(e);
        touchStartYRef.current = null;
      }}
      onTouchCancel={(e) => {
        props.onTouchCancel?.(e);
        touchStartYRef.current = null;
      }}
      className={cn("overflow-y-auto overscroll-contain", className)}
    >
      {/* 顶部哨兵：完全可见时认为“到顶” */}
      <div
        ref={topSentinelRef}
        aria-hidden="true"
        className="h-px w-full pointer-events-none"
      />

      {children}

      {/* 底部哨兵：完全可见时认为“到底” */}
      <div
        ref={bottomSentinelRef}
        aria-hidden="true"
        className="h-px w-full pointer-events-none"
      />
    </div>
  );
}

ScrollArea.displayName = "ScrollArea";
