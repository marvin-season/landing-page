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

export function useIncrementalMarkdown(content: string) {
  const lastSplitPointRef = useRef<number>(-1);

  const cachedStableResult = useRef<ReactNode>([]);

  const cachedTailResult = useRef<ReactNode>(null);

  return useMemo(() => {
    const splitPoint = findSafeSplitPoint(content);

    if (splitPoint !== lastSplitPointRef.current) {
      lastSplitPointRef.current = splitPoint;
      cachedStableResult.current = stableProcessor.processSync(
        content.slice(0, splitPoint),
      ).result;
      console.log("cachedStableResults", cachedStableResult.current);
    }

    const tailContent = splitPoint === -1 ? content : content.slice(splitPoint);

    if (
      cachedTailResult.current === null ||
      typeof cachedTailResult.current !== "string" ||
      tailContent !== ""
    ) {
      cachedTailResult.current = processor.processSync(tailContent).result;
    }

    return (
      <Fragment key="incremental-markdown-root">
        <Fragment key="stable-part">{cachedStableResult.current}</Fragment>
        <Fragment key="tail-part">{cachedTailResult.current}</Fragment>
      </Fragment>
    );
  }, [content]);
}
