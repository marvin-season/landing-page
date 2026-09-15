import { findTextRange } from "../pdf-citation-highlight/range";
import { overlayMarkdownCitation } from "./overlay";

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

export function createMarkdownCitationHighlight(
  article: HTMLElement,
  quote: string,
  container: HTMLElement,
) {
  let result: ReturnType<typeof overlayMarkdownCitation>;
  let hasScrolled = false;

  const clear = () => {
    result?.clear();
    result = undefined;
  };

  const highlight = () => {
    clear();
    const range = findTextRange(article, quote);
    if (!range) return;
    result = overlayMarkdownCitation(article, range);
    if (!hasScrolled && result?.target) {
      scrollToHighlight(container, result.target);
      hasScrolled = true;
    }
  };

  return { highlight, clear };
}
