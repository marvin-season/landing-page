export function overlayMarkdownCitation(article: HTMLElement, range: Range) {
  const bounds = article.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "pointer-events:none;position:absolute;inset:0;z-index:2;";
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.mdCitation = "true";

  const scaleX = bounds.width / article.offsetWidth || 1;
  const scaleY = bounds.height / article.offsetHeight || 1;

  for (const rect of range.getClientRects()) {
    const left = Math.max(rect.left, bounds.left);
    const top = Math.max(rect.top, bounds.top);
    const right = Math.min(rect.right, bounds.right);
    const bottom = Math.min(rect.bottom, bounds.bottom);
    if (right <= left || bottom <= top) continue;
    const mark = document.createElement("span");
    mark.style.cssText =
      "position:absolute;background:rgba(255,226,143,.72);mix-blend-mode:multiply;border-radius:2px;";
    Object.assign(mark.style, {
      left: `${(left - bounds.left) / scaleX - article.clientLeft}px`,
      top: `${(top - bounds.top) / scaleY - article.clientTop}px`,
      width: `${(right - left) / scaleX}px`,
      height: `${(bottom - top) / scaleY}px`,
    });
    overlay.appendChild(mark);
  }

  if (!overlay.firstElementChild) return;

  article.appendChild(overlay);
  return {
    target: overlay.firstElementChild,
    clear: () => overlay.remove(),
  };
}
