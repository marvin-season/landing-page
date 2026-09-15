import type { CitationHighlighter } from "./highlighters/types";
import { findTextRange } from "./range";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToHighlight(container: HTMLElement, element: Element) {
  const target = element.getBoundingClientRect();
  const viewport = container.getBoundingClientRect();
  container.scrollTo({
    top:
      container.scrollTop +
      target.top -
      viewport.top -
      container.clientTop -
      (container.clientHeight - target.height) / 2,
    left:
      container.scrollLeft +
      Math.min(0, target.left - viewport.left) +
      Math.max(0, target.right - viewport.right),
    behavior: prefersReducedMotion() ? "instant" : "smooth",
  });
}

export function createCitationHighlight(
  page: HTMLDivElement,
  quote: string,
  container: HTMLElement,
  renderer: CitationHighlighter,
) {
  let result: ReturnType<CitationHighlighter>;
  let hasScrolled = false;

  const clear = () => {
    result?.clear();
    result = undefined;
  };

  const highlight = () => {
    const layer = page.querySelector<HTMLElement>(".textLayer");
    if (!layer || layer.hidden) return;
    clear();
    const range = findTextRange(layer, quote);
    if (!range) return;
    result = renderer({ page, textLayer: layer, range, quote });
    if (!hasScrolled && result?.target) {
      scrollToHighlight(container, result.target);
      hasScrolled = true;
    }
  };

  return { highlight, clear };
}
