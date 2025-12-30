"use client";

import { Fragment, type ReactNode, useMemo, useRef } from "react";
import processor, { createProcessor } from "./processor";

const stableProcessor = createProcessor({ streaming: false });

/**
 * 寻找安全的分割点
 * 规则：最后一个双换行符 \n\n，且确保不在代码块或数学公式块中
 */
function findSafeSplitPoint(content: string): number {
  const regex = /\n\n/g;
  let match: RegExpExecArray | null;
  let lastMatchIndex = -1;

  while (true) {
    match = regex.exec(content);
    if (match === null) break;

    const index = match.index;
    const prefix = content.slice(0, index);

    // 检查是否在代码块中 (```)
    const codeBlockCount = (prefix.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) continue;

    // 检查是否在数学公式块中 ($$)
    const mathBlockCount = (prefix.match(/\$\$/g) || []).length;
    if (mathBlockCount % 2 !== 0) continue;

    lastMatchIndex = index + match[0].length;
  }

  return lastMatchIndex;
}

export interface IncrementalMarkdownOptions {
  /**
   * 是否还有下一个 chunk
   */
  hasNextChunk?: boolean;
}

export function useIncrementalMarkdown(
  content: string,
  options: IncrementalMarkdownOptions = {},
) {
  const { hasNextChunk = false } = options;

  const lastSplitPointRef = useRef<number>(-1);
  const cachedStableResult = useRef<ReactNode>([]);

  return useMemo(() => {
    const splitPoint = !hasNextChunk
      ? content.length
      : findSafeSplitPoint(content);

    if (splitPoint !== lastSplitPointRef.current) {
      lastSplitPointRef.current = splitPoint;
      cachedStableResult.current = stableProcessor.processSync(
        content.slice(0, splitPoint),
      ).result as ReactNode;
    }

    const tailContent = splitPoint === -1 ? content : content.slice(splitPoint);

    const tail = tailContent
      ? (processor.processSync(tailContent).result as ReactNode)
      : undefined;

    const result = (
      <Fragment key="incremental-markdown-root">
        <Fragment key="stable-part">{cachedStableResult.current}</Fragment>
        <Fragment key="tail-part">{tail}</Fragment>
      </Fragment>
    );

    return result;
  }, [content, hasNextChunk]);
}
