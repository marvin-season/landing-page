import { cn } from "@landing-page/utils";
import Image from "next/image";

const portraits = [
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

const characterPortraits = new Map<string, (typeof portraits)[number]>([
  ["engineer", "female-02"],
  ["dispatcher", "male-02"],
  ["reporter", "female-01"],
  ["former-player", "male-03"],
  ["hanli", "male-01"],
  ["mupeiling", "female-04"],
  ["nangongwan", "female-05"],
  ["jiangwan", "female-01"],
  ["suli", "female-03"],
  ["suwan", "female-06"],
  ["linzhixia", "female-07"],
  ["liangzhi", "female-02"],
  ["songcheng", "female-04"],
]);

function portraitFor(id: string) {
  const portrait = characterPortraits.get(id);
  if (portrait) return portrait;

  // Use identity rather than name or list position so edits and reordering
  // cannot change the avatar, including messages in existing worlds.
  let hash = 0;
  for (const char of id)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return portraits[hash % portraits.length];
}

export function CharacterAvatar({
  id,
  name,
  size = "default",
}: {
  id: string;
  name: string;
  size?: "sm" | "default";
}) {
  const pixels = size === "sm" ? 16 : 36;
  return (
    <Image
      src={`/worlds/avatars/${portraitFor(id)}.webp`}
      alt={name}
      width={pixels}
      height={pixels}
      className={cn(
        "shrink-0 rounded-full bg-muted object-cover",
        size === "sm" ? "size-4" : "size-9",
      )}
    />
  );
}
