"use client";

import { type ReactNode, useEffect } from "react";

const FONT_VARS = [
  ["--font-sans", "var(--font-liu-jian-mao-cao), cursive"],
  ["--font-serif", "var(--font-liu-jian-mao-cao), cursive"],
] as const;

/**
 * Radix Dialog / Sheet / Dropdown 等 Portal 挂在 body 下，不会继承
 * worlds layout 内层 div 的字体。挂载期间把同一套字体类和 CSS 变量写到 body。
 */
export function WorldsFontScope({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const { body } = document;
    const classes = className.split(/\s+/).filter(Boolean);
    body.classList.add(...classes);

    const previous = FONT_VARS.map(
      ([prop]) => [prop, body.style.getPropertyValue(prop)] as const,
    );
    for (const [prop, value] of FONT_VARS) {
      body.style.setProperty(prop, value);
    }

    return () => {
      body.classList.remove(...classes);
      for (const [prop, value] of previous) {
        if (value) body.style.setProperty(prop, value);
        else body.style.removeProperty(prop);
      }
    };
  }, [className]);

  return <div className={`${className} h-full min-h-0`}>{children}</div>;
}
