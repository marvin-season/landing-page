import { findCitationRange } from "./match";

export function findTextRange(layer: HTMLElement, quote: string) {
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let text = "";
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    nodes.push(node);
    text += node.data;
  }
  const match = findCitationRange(text, quote);
  if (!match) return;
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const node of nodes) {
    const end = offset + node.length;
    if (!started && match.start < end) {
      range.setStart(node, match.start - offset);
      started = true;
    }
    if (started && match.end <= end) {
      range.setEnd(node, match.end - offset);
      break;
    }
    offset = end;
  }
  return started ? range : undefined;
}
