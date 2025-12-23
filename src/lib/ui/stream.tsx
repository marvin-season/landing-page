import type { ReactNode } from "react";

/**
 * 流式拆分输出模板字符串：返回一个依次输出静态片段和动态内容的生成器。
 * 支持嵌套调用：toStream`hello ${toStream`world`}`
 */
export function* toStream(
  strings: TemplateStringsArray,
  ...args: (ReactNode | Generator<ReactNode, void, unknown>)[]
): Generator<ReactNode, void, unknown> {
  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    if (str) {
      // 将静态字符串部分拆分为单词和空格
      const parts = str.split(/(\s+)/);
      for (const part of parts) {
        if (part) {
          yield part;
        }
      }
    }

    if (i < args.length) {
      const arg = args[i];

      // 普通模板变量作为整体输出
      yield arg as ReactNode;
    }
  }
}
