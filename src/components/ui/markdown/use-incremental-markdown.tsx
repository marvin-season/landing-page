"use client";

import { Fragment, type ReactNode, useMemo, useRef } from "react";
import processor from "./processor";

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

  const cachedStableResults = useRef<ReactNode[]>([]);

  const cachedTailResult = useRef<ReactNode>(null);

  return useMemo(() => {
    const splitPoint = findSafeSplitPoint(content);

    if (splitPoint !== lastSplitPointRef.current) {
      lastSplitPointRef.current = splitPoint;
      cachedStableResults.current.push(cachedTailResult.current);
      console.log("cachedStableResults", cachedStableResults.current);
    }

    if (splitPoint === -1) {
      cachedTailResult.current = processor.processSync(content).result;
    } else {
      cachedTailResult.current = processor.processSync(
        content.slice(splitPoint),
      ).result;
    }

    return (
      <Fragment key="incremental-markdown-root">
        {cachedStableResults.current.map((result, index) => (
          <Fragment key={`stable-part-${index}`}>{result}</Fragment>
        ))}
        <Fragment key="tail-part">{cachedTailResult.current}</Fragment>
      </Fragment>
    );
  }, [content]);
}
