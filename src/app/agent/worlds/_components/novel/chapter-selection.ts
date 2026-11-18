import { sourceOffsets } from "./chapter-markdown";
import type { ChapterTextRange } from "./model";

const sourceSelector = "[data-source-start][data-source-end]";

function formatsAt(element: HTMLElement) {
  const formats: HTMLElement[] = [];
  for (
    let current = element.parentElement?.closest<HTMLElement>(
      "[data-format-start]",
    );
    current;
    current = current.parentElement?.closest<HTMLElement>("[data-format-start]")
  ) {
    formats.push(current);
  }
  return formats;
}

export function selectedChapterText(
  body: HTMLElement,
  source: string,
  range: Range,
): ChapterTextRange | null {
  if (
    range.collapsed ||
    !body.contains(range.startContainer) ||
    !body.contains(range.endContainer) ||
    !range.toString().trim()
  )
    return null;

  for (const container of [range.startContainer, range.endContainer]) {
    if (
      container.nodeType === Node.TEXT_NODE &&
      container.textContent?.trim() &&
      !container.parentElement?.closest(sourceSelector)
    )
      return null;
  }

  const selected = Array.from(
    body.querySelectorAll<HTMLElement>(sourceSelector),
  ).filter((element) => {
    if (!range.intersectsNode(element)) return false;
    const text = element.firstChild;
    return (
      !text ||
      ((text !== range.startContainer ||
        range.startOffset < (text.textContent?.length ?? 0)) &&
        (text !== range.endContainer || range.endOffset > 0))
    );
  });
  const first = selected[0];
  const last = selected.at(-1);
  if (!first || !last) return null;

  function boundary(element: HTMLElement, side: "start" | "end") {
    const container =
      side === "start" ? range.startContainer : range.endContainer;
    const offset = side === "start" ? range.startOffset : range.endOffset;
    const start = Number(element.dataset.sourceStart);
    const end = Number(element.dataset.sourceEnd);
    let position = side === "start" ? start : end;

    if (element.contains(container)) {
      if (element.tagName !== "SPAN" || container.nodeType !== Node.TEXT_NODE)
        return null;
      const text = container.textContent ?? "";
      const raw = source.slice(start, end);
      const index =
        offset === 0
          ? 0
          : offset === text.length
            ? raw.length
            : raw === text
              ? offset
              : sourceOffsets(raw, text)?.[offset];
      if (index === undefined || index < 0) return null;
      position = start + index;
    }

    // Include formatting delimiters only if the entire formatted edge was selected.
    const other = side === "start" ? last : first;
    const textPosition = position;
    for (const format of formatsAt(element)) {
      if (format.contains(other ?? null)) continue;
      const content = format.querySelectorAll<HTMLElement>(sourceSelector);
      const edge = side === "start" ? content[0] : content[content.length - 1];
      const extreme =
        side === "start" ? edge?.dataset.sourceStart : edge?.dataset.sourceEnd;
      if (textPosition !== Number(extreme)) return null;
      position = Number(
        side === "start"
          ? format.dataset.formatStart
          : format.dataset.formatEnd,
      );
    }
    return position;
  }

  let start = boundary(first, "start");
  let end = boundary(last, "end");
  if (start === null || end === null || start >= end) return null;
  const text = source.slice(start, end);
  if (!text.trim()) return null;
  start += text.length - text.trimStart().length;
  end -= text.length - text.trimEnd().length;
  return { start, end };
}
