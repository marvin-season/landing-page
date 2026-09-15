import { selectionRects } from "../rects";
import type { CitationHighlighter } from "./types";

export const overlayCitationHighlighter: CitationHighlighter = ({
  page,
  range,
}) => {
  const bounds = page.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "pointer-events:none;position:absolute;inset:0;z-index:2;";
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.pdfCitation = "true";

  const scaleX = bounds.width / page.offsetWidth || 1;
  const scaleY = bounds.height / page.offsetHeight || 1;

  for (const rect of selectionRects(range, bounds)) {
    const mark = document.createElement("span");
    mark.style.cssText =
      "position:absolute;background:rgba(255,226,143,.72);mix-blend-mode:multiply;border-radius:2px;";
    Object.assign(mark.style, {
      left: `${rect.left / scaleX - page.clientLeft}px`,
      top: `${rect.top / scaleY - page.clientTop}px`,
      width: `${rect.width / scaleX}px`,
      height: `${rect.height / scaleY}px`,
    });
    overlay.appendChild(mark);
  }

  page.appendChild(overlay);
  return {
    target: overlay.firstElementChild,
    clear: () => overlay.remove(),
  };
};
