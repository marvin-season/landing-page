"use client";

import Image from "next/image";
import { useMemo } from "react";
import * as prod from "react/jsx-runtime";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { cn } from "@/lib/utils";

// 样式
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface UnifiedMarkdownProps {
  content: string;
  className?: string;
}

/**
 * 使用 unified 生态实现的富文本解析组件
 * 支持：GFM (表格、任务列表等)、数学公式 (Katex)、代码高亮 (Highlight.js)
 */
export function UnifiedMarkdown({ content, className }: UnifiedMarkdownProps) {
  const processor = useMemo(() => {
    return (
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        // 如果需要支持 HTML 标签，可以加上 rehype-raw，但需要注意安全
        // .use(rehypeRaw)
        .use(rehypeKatex)
        .use(rehypeHighlight, {
          detect: true,
          ignoreMissing: true,
        })
        .use(rehypeReact, {
          ...prod,
          components: {
            h1: ({ className, ...props }: any) => (
              <h1
                className={cn(
                  "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-6",
                  className,
                )}
                {...props}
              />
            ),
            h2: ({ className, ...props }: any) => (
              <h2
                className={cn(
                  "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mt-10 mb-4",
                  className,
                )}
                {...props}
              />
            ),
            h3: ({ className, ...props }: any) => (
              <h3
                className={cn(
                  "scroll-m-20 text-2xl font-semibold tracking-tight mt-8 mb-4",
                  className,
                )}
                {...props}
              />
            ),
            p: ({ className, ...props }: any) => (
              <p
                className={cn("leading-7 not-first:mt-6", className)}
                {...props}
              />
            ),
            ul: ({ className, ...props }: any) => (
              <ul
                className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
                {...props}
              />
            ),
            ol: ({ className, ...props }: any) => (
              <ol
                className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)}
                {...props}
              />
            ),
            li: ({ className, ...props }: any) => (
              <li className={cn("mt-2", className)} {...props} />
            ),
            blockquote: ({ className, ...props }: any) => (
              <blockquote
                className={cn("mt-6 border-l-2 pl-6 italic", className)}
                {...props}
              />
            ),
            hr: ({ className, ...props }: any) => (
              <hr className={cn("my-4 md:my-8", className)} {...props} />
            ),
            table: ({ className, ...props }: any) => (
              <div className="my-6 w-full overflow-y-auto">
                <table className={cn("w-full", className)} {...props} />
              </div>
            ),
            tr: ({ className, ...props }: any) => (
              <tr
                className={cn("m-0 border-t p-0 even:bg-muted", className)}
                {...props}
              />
            ),
            th: ({ className, ...props }: any) => (
              <th
                className={cn(
                  "border px-4 py-2 text-left font-bold [[align=center]]:text-center [[align=right]]:text-right",
                  className,
                )}
                {...props}
              />
            ),
            td: ({ className, ...props }: any) => (
              <td
                className={cn(
                  "border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right",
                  className,
                )}
                {...props}
              />
            ),
            pre: ({ className, ...props }: any) => (
              <pre
                className={cn(
                  "mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 p-4 dark:bg-zinc-900",
                  className,
                )}
                {...props}
              />
            ),
            code: ({ className, ...props }: any) => (
              <code
                className={cn(
                  "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
                  className,
                )}
                {...props}
              />
            ),
            img: ({ className, alt, ...props }: any) => (
              // eslint-disable-next-line @next/next/no-img-element
              <Image
                className={cn("rounded-md border", className)}
                alt={alt}
                {...props}
              />
            ),
          },
        }) as any
    );
  }, []);

  const contentComponent = useMemo(() => {
    try {
      return processor.processSync(content).result;
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return content;
    }
  }, [processor, content]);

  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        className,
      )}
    >
      {contentComponent}
    </div>
  );
}
