"use client";

import { type ReactNode, useEffect } from "react";

const FONT_VARS = [
  ["--font-sans", "var(--font-liu-jian-mao-cao), cursive"],
  ["--font-serif", "var(--font-liu-jian-mao-cao), cursive"],
] as const;

/**
 * Radix Dialog / Sheet / Dropdown 等 Portal 挂在 body 下，不会继承
 * worlds layout 内层 div 的字体。挂载期间把同一套字体类和 CSS 变量写到 body。
 *
 * Agent 根布局默认 `antialiased`（灰度抗锯齿）会让毛笔字显得更细；
 * 在本路由改为 `subpixel-antialiased`，离开后还原。
 */
export function WorldsFontScope({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const scopeClassName = `${className} subpixel-antialiased`;

  useEffect(() => {
    const { body } = document;
    const classes = scopeClassName.split(/\s+/).filter(Boolean);
    const hadAntialiased = body.classList.contains("antialiased");
    if (hadAntialiased) body.classList.remove("antialiased");
    body.classList.add(...classes);

    const previous = FONT_VARS.map(
      ([prop]) => [prop, body.style.getPropertyValue(prop)] as const,
    );
    for (const [prop, value] of FONT_VARS) {
      body.style.setProperty(prop, value);
    }

    return () => {
      body.classList.remove(...classes);
      if (hadAntialiased) body.classList.add("antialiased");
      for (const [prop, value] of previous) {
        if (value) body.style.setProperty(prop, value);
        else body.style.removeProperty(prop);
      }
    };
  }, [scopeClassName]);

  return <div className={`${scopeClassName} h-full min-h-0`}>{children}</div>;
}
