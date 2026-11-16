import { cn } from "@landing-page/utils";
import Image from "next/image";
import {
  type WorldAvatar,
  worldAvatarFromSeed,
  worldAvatarSrc,
} from "@/lib/group-chat/world-avatar";

export function CharacterAvatar({
  id,
  name,
  avatar,
  size = "default",
}: {
  id: string;
  name: string;
  avatar?: WorldAvatar;
  size?: "sm" | "md" | "default";
}) {
  const pixels = size === "sm" ? 16 : size === "md" ? 28 : 36;
  return (
    <Image
      src={worldAvatarSrc(avatar ?? worldAvatarFromSeed(id))}
      alt={name}
      width={pixels}
      height={pixels}
      className={cn(
        "shrink-0 rounded-full bg-muted object-cover",
        size === "sm" ? "size-4" : size === "md" ? "size-7" : "size-9",
      )}
    />
  );
}
