export const worldGradients = [
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
  "indigo",
] as const;

export type WorldGradient = (typeof worldGradients)[number];

export function worldGradientFromSeed(seed: string): WorldGradient {
  let hash = 0;
  for (const char of seed)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return worldGradients[hash % worldGradients.length]!;
}
