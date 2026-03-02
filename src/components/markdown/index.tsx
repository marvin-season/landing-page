"use client";

import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { cn } from "@/lib/utils";

export default function Markdown(props: {
  children: string;
  className?: string;
  hasNextChunk?: boolean;
}) {
  const { children, className, hasNextChunk } = props;
  return (
    <UnifiedMarkdown
      content={children}
      className={cn("text-sm lg:text-base", className)}
      hasNextChunk={hasNextChunk}
    />
  );
}
