export function normalizeCitationText(text: string) {
  let normalized = "";
  const offsets: number[] = [];
  const ends: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (/[\s\u00AD\u200B-\u200D]/u.test(character)) continue;
    const value = character.normalize("NFKC");
    normalized += value;
    for (let count = 0; count < value.length; count++) {
      offsets.push(index);
      ends.push(index + 1);
    }
  }
  return { normalized, offsets, ends };
}

export function findCitationRange(text: string, quote: string) {
  const source = normalizeCitationText(text);
  const target = normalizeCitationText(quote).normalized;
  if (!target) return undefined;
  const start = source.normalized.indexOf(target);
  if (start < 0) return undefined;
  return {
    start: source.offsets[start],
    end: source.ends[start + target.length - 1],
  };
}
