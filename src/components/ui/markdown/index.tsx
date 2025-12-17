"use client";

import XMarkdown from "@ant-design/x-markdown";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type MarkdownProps = ComponentProps<typeof XMarkdown>;

const DEFAULT_STREAMING = {
  enableAnimation: true,
  hasNextChunk: false,
  animationConfig: { fadeDuration: 400 },
} satisfies NonNullable<MarkdownProps["streaming"]>;

export default function Markdown(props: MarkdownProps) {
  const { streaming = {}, className, ...rest } = props;
  return (
    <XMarkdown
      {...rest}
      className={cn("", className)}
      streaming={{
        ...DEFAULT_STREAMING,
        ...streaming,
      }}
    />
  );
}
