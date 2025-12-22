"use client";

import Tippy, { type TippyProps } from "@tippyjs/react";
import {
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export type TooltipProps = Omit<TippyProps, "children" | "content"> & {
  content: ReactNode;
  children: ReactNode;
  /**
   * 当 children 不是一个可直接作为 reference 的 ReactElement 时会自动包一层 <span>，
   * 这个 className 仅在“自动包裹”场景下生效。
   */
  triggerClassName?: string;
};

export function Tooltip({
  content,
  children,
  triggerClassName,
  theme = "landing",
  placement = "top",
  trigger = "mouseenter focus",
  delay = [250, 0],
  duration = [120, 80],
  offset = [0, 8],
  arrow = true,
  interactive = false,
  maxWidth = 320,
  ...props
}: TooltipProps) {
  // content 为空时不渲染 tooltip，避免无意义的 DOM/监听器。
  if (content == null || content === false || content === "") {
    return children;
  }

  const reference: ReactElement =
    isValidElement(children) && children.type !== Fragment ? (
      children
    ) : (
      <span className={triggerClassName}>{children}</span>
    );

  return (
    <Tippy
      content={content}
      theme={theme}
      placement={placement}
      trigger={trigger}
      delay={delay}
      duration={duration}
      offset={offset}
      arrow={arrow}
      interactive={interactive}
      maxWidth={maxWidth}
      {...props}
    >
      {reference}
    </Tippy>
  );
}
