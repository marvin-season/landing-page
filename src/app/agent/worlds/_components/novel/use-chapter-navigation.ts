import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

export function useChapterNavigation({
  readingPanel,
  chapterId,
  previousId,
  nextId,
  keyboardDisabled,
  onSelect,
}: {
  readingPanel: RefObject<HTMLDivElement | null>;
  chapterId: string | undefined;
  previousId: string | undefined;
  nextId: string | undefined;
  keyboardDisabled: boolean;
  onSelect: (id: string) => void;
}) {
  const chapterAnchor = useRef<HTMLElement>(null);
  const scrollTarget = useRef<number | null>(null);

  const goToChapter = useCallback(
    (id: string) => {
      const panel = readingPanel.current;
      const anchor = chapterAnchor.current;
      if (panel && anchor) {
        // Keep the room header in place when the chapter start is already visible.
        const offset =
          anchor.getBoundingClientRect().top -
          panel.getBoundingClientRect().top;
        scrollTarget.current =
          offset >= 0 && offset < panel.clientHeight
            ? panel.scrollTop
            : panel.scrollTop + offset;
      }
      onSelect(id);
    },
    [onSelect, readingPanel],
  );

  useLayoutEffect(() => {
    const panel = readingPanel.current;
    if (!chapterId || !panel || scrollTarget.current === null) return;
    panel.scrollTop = scrollTarget.current;
    scrollTarget.current = null;
  }, [chapterId, readingPanel]);

  useEffect(() => {
    if (keyboardDisabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey)
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable='true'], [role='combobox'], [role='dialog'], [role='listbox'], [role='menu']",
        )
      )
        return;
      if (document.querySelector("[role='dialog']")) return;
      const destinationId = event.key === "ArrowLeft" ? previousId : nextId;
      if (!destinationId) return;
      event.preventDefault();
      goToChapter(destinationId);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToChapter, keyboardDisabled, nextId, previousId]);

  return { chapterAnchor, goToChapter };
}
