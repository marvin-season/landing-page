export const worldAvatars = [
  "male-01",
  "male-02",
  "male-03",
  "female-01",
  "female-02",
  "female-03",
  "female-04",
  "female-05",
  "female-06",
  "female-07",
] as const;

export type WorldAvatar = (typeof worldAvatars)[number];

export function worldAvatarFromSeed(seed: string): WorldAvatar {
  let hash = 0;
  for (const char of seed)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return worldAvatars[hash % worldAvatars.length]!;
}

export function worldAvatarSrc(avatar: WorldAvatar) {
  return `/worlds/avatars/${avatar}.webp`;
}
