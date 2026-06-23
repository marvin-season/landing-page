"use client";

import { cn } from "@landing-page/utils";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";

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
