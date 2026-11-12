import type { AiMentionItem, MentionRange } from "./types";

const DEFAULT_TRIGGER = "@";

export function inlineMentions<T>(
  value: string,
  items: readonly AiMentionItem<T>[],
  trigger = DEFAULT_TRIGGER,
): AiMentionItem<T>[] {
  if (!trigger) return [];
  const candidates = [...items].sort((a, b) => b.label.length - a.label.length);
  const result: AiMentionItem<T>[] = [];
  const seen = new Set<string>();
  let start = value.indexOf(trigger);
  while (start !== -1) {
    const before = value.charAt(start - 1);
    if (start === 0 || /[\s\p{P}]/u.test(before)) {
      const nameStart = start + trigger.length;
      const item = candidates.find((candidate) => {
        if (!candidate.label || !value.startsWith(candidate.label, nameStart))
          return false;
        const after = value.charAt(nameStart + candidate.label.length);
        return !after || /[\s\p{P}]/u.test(after);
      });
      if (item && !seen.has(item.id)) {
        result.push(item);
        seen.add(item.id);
      }
    }
    start = value.indexOf(trigger, start + Math.max(trigger.length, 1));
  }
  return result;
}

export function getActiveMention(
  value: string,
  caret: number,
  trigger = DEFAULT_TRIGGER,
): MentionRange | null {
  if (caret < 0 || caret > value.length) return null;
  const before = value.slice(0, caret);
  const start = before.lastIndexOf(trigger);
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(before.charAt(start - 1))) return null;
  const query = before.slice(start + trigger.length);
  if (/[\s\n]/.test(query)) return null;
  return { start, end: caret, query };
}

export function filterMentionItems<T>(
  items: readonly AiMentionItem<T>[],
  query: string,
  selectedIds?: ReadonlySet<string>,
): AiMentionItem<T>[] {
  const needle = query.trim().toLowerCase();
  const result: AiMentionItem<T>[] = [];
  for (const item of items) {
    if (selectedIds?.has(item.id)) continue;
    if (
      needle &&
      !item.label.toLowerCase().includes(needle) &&
      !item.description?.toLowerCase().includes(needle)
    ) {
      continue;
    }
    result.push(item);
  }
  return result;
}

export function consumeMentionQuery(
  value: string,
  range: MentionRange,
): { value: string; caret: number } {
  const next = `${value.slice(0, range.start)}${value.slice(range.end)}`;
  return { value: next, caret: range.start };
}
