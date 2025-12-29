"use client";

import { Fragment, type ReactNode, useMemo, useRef } from "react";
import processor, { createProcessor } from "./processor";
import { useIsVisible } from "./use-visibility";

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
   * 当窗口在后台时是否暂停解析
   * @default false
   */
  pauseOnBackground?: boolean;

  streaming?: {
    hasNextChunk: boolean;
  };
}

export function useIncrementalMarkdown(
  content: string,
  options: IncrementalMarkdownOptions = {},
) {
  const { pauseOnBackground = false, streaming } = options;
  const isVisible = useIsVisible();

  const lastSplitPointRef = useRef<number>(-1);
  const cachedStableResult = useRef<ReactNode>([]);
  const cachedTailResult = useRef<ReactNode>(null);
  const lastResultRef = useRef<ReactNode>(null);

  return useMemo(() => {
    // 如果开启了后台暂停，且窗口在后台，且已经有缓存结果，则直接返回上次的结果
    if (pauseOnBackground && !isVisible && lastResultRef.current) {
      return lastResultRef.current;
    }

    if (!streaming?.hasNextChunk) {
      return stableProcessor.processSync(content).result as ReactNode;
    }

    const splitPoint = findSafeSplitPoint(content);

    if (splitPoint !== lastSplitPointRef.current) {
      lastSplitPointRef.current = splitPoint;
      cachedStableResult.current = stableProcessor.processSync(
        content.slice(0, splitPoint),
      ).result as ReactNode;
    }

    const tailContent = splitPoint === -1 ? content : content.slice(splitPoint);

    if (
      cachedTailResult.current === null ||
      typeof cachedTailResult.current !== "string" ||
      tailContent !== ""
    ) {
      cachedTailResult.current = processor.processSync(tailContent)
        .result as ReactNode;
    }

    const result = (
      <Fragment key="incremental-markdown-root">
        <Fragment key="stable-part">{cachedStableResult.current}</Fragment>
        <Fragment key="tail-part">{cachedTailResult.current}</Fragment>
      </Fragment>
    );

    lastResultRef.current = result;
    return result;
  }, [content, isVisible, streaming, pauseOnBackground]);
}
