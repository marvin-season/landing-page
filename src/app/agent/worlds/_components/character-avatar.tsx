import { cn } from "@landing-page/utils";
import Image from "next/image";

const portraits = [
  "01-287511",
  "02-389045",
  "03-304074",
  "04-258617",
  "05-548467",
  "06-446343",
  "07-415259",
  "08-788827",
  "09-954464",
  "10-876607",
  "11-858550",
  "12-648136",
  "13-924762",
  "14-200673",
  "15-860932",
] as const;

const characterPortraits = new Map<string, (typeof portraits)[number]>([
  ["engineer", "01-287511"],
  ["dispatcher", "02-389045"],
  ["reporter", "03-304074"],
  ["former-player", "04-258617"],
  ["hanli", "05-548467"],
  ["mupeiling", "06-446343"],
  ["nangongwan", "07-415259"],
  ["jiangwan", "08-788827"],
  ["suli", "09-954464"],
  ["suwan", "10-876607"],
  ["linzhixia", "11-858550"],
  ["liangzhi", "12-648136"],
  ["songcheng", "13-924762"],
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
      src={`/images/18/girls-rating/${portraitFor(id)}.webp`}
      alt={name}
      width={pixels}
      height={pixels}
      className={cn(
        "shrink-0 rounded-full bg-muted object-cover object-top",
        size === "sm" ? "size-4" : "size-9",
      )}
    />
  );
}
