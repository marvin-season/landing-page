'use client';

import { cn } from '@/lib/utils';
import { useIncrementalMarkdown } from './use-incremental-markdown';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

export function UnifiedMarkdown({
  content,
  className,
  hasNextChunk = false,
}: {
  content: string;
  className?: string;
  hasNextChunk?: boolean;
}) {
  const contentComponent = useIncrementalMarkdown(content, {
    hasNextChunk,
  });

  return (
    <div
      className={cn(
        'prose prose-slate dark:prose-invert max-w-none',
        'streaming-content', // 触发 CSS 中的 :last-child 动画
        className,
      )}
    >
      {contentComponent}
    </div>
  );
}
