"use client";

import { useEffect, useRef } from "react";

type UseIntersectionObserverOptions = IntersectionObserverInit & {
  /**
   * 仅在 entry.isIntersecting 为 true 时触发（保持向后兼容）
   */
  onIntersect?: (entry: IntersectionObserverEntry) => void;
  /**
   * 每次观察到变化都会触发（包含进入与离开）
   */
  onChange?: (entry: IntersectionObserverEntry) => void;
};

export const useIntersectionObserver = <T extends Element = HTMLElement>(
  options: UseIntersectionObserverOptions = {},
) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      console.warn("IntersectionObserver is not supported in this browser");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        options.onChange?.(entry);
        if (entry.isIntersecting) {
          options.onIntersect?.(entry);
        }
      },
      {
        root: options.root,
        rootMargin: options.rootMargin,
        threshold: options.threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [
    options.root,
    options.rootMargin,
    options.threshold,
    options.onChange,
    options.onIntersect,
  ]);

  return { ref };
};
