import { useRef } from "react";

type UsePageWheelParams = {
  onScrollUp: () => void;
  onScrollDown: () => void;
};

export function usePageWheel(params: UsePageWheelParams) {
  const { onScrollUp, onScrollDown } = params;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  return {
    scrollContainerRef,
    lastScrollTimeRef,
    handleWheel: (e: React.WheelEvent) => {
      const now = Date.now();
      // 500ms throttle to prevent rapid switching
      if (now - lastScrollTimeRef.current < 200) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop <= 0;
      // Check if at bottom with 1px buffer for float precision
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

      if (e.deltaY < 0 && isAtTop) {
        // Scrolling up at top -> previous page
        onScrollUp();
        lastScrollTimeRef.current = now;
      } else if (e.deltaY > 0 && isAtBottom) {
        // Scrolling down at bottom -> next page
        onScrollDown();
        lastScrollTimeRef.current = now;
      }
    },
  };
}
