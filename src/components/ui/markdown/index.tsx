"use client";

import XMarkdown from "@ant-design/x-markdown";
import type { ComponentProps } from "react";

export type MarkdownProps = ComponentProps<typeof XMarkdown>;

const DEFAULT_STREAMING = {
  enableAnimation: true,
  hasNextChunk: false,
  animationConfig: { fadeDuration: 400 },
} satisfies NonNullable<MarkdownProps["streaming"]>;

export default function Markdown(props: MarkdownProps) {
  const { streaming = {}, ...rest } = props;
  return (
    <XMarkdown
      {...rest}
      streaming={{
        ...DEFAULT_STREAMING,
        ...streaming,
      }}
    />
  );
}
