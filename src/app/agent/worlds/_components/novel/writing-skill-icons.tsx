import { Aperture, Feather, MessageSquareText, Sparkles } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const skillIcons: Record<string, Icon> = {
  "scene-driven": Aperture,
  "dialogue-first": MessageSquareText,
  "chapter-hook": Sparkles,
  "prose-imagery": Feather,
};

export function WritingSkillIcon({
  id,
  className = "size-3.5",
}: {
  id: string;
  className?: string;
}) {
  const Icon = skillIcons[id] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
