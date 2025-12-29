"use client";

import { UnifiedMarkdown } from "@/components/unified-markdown";
import { cn } from "@/lib/utils";

export default function Markdown(props: {
  children: string;
  className?: string;
  streaming?: {
    hasNextChunk: boolean;
  };
}) {
  const { children, className, streaming } = props;
  return (
    <UnifiedMarkdown
      content={children}
      className={cn("", className)}
      streaming={streaming}
    />
  );
}
