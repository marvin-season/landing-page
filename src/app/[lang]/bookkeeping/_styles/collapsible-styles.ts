import { cls } from "./layout";

export const collapsibleTriggerCls = cls`
  cursor-pointer text-sm font-medium text-foreground
  flex min-h-11 items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2
  transition-colors hover:bg-muted/70
  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 data-[state=open]:bg-muted/70
  group/collapsible-trigger w-full text-left
`;

export const collapsibleFlushTriggerCls = cls`
  cursor-pointer text-sm font-medium text-foreground
  flex min-h-14 items-center gap-2 rounded-none bg-transparent px-3 py-2
  transition-colors hover:bg-muted/40
  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50
  group/collapsible-trigger w-full text-left
`;

export const collapsibleChevronCls = cls`
  size-4 shrink-0 text-muted-foreground transition-transform duration-200
  group-data-[state=open]/collapsible-trigger:rotate-180 motion-reduce:transition-none
`;

// forceMount 保留表单草稿；单个 min-h-0 overflow-clip 子层让内容平滑收起。
// 固定过渡时长，避免 Radix 测量时的内联 transition-duration: 0s 打断动画。
export const collapsibleContentCls = cls`
  grid grid-rows-[0fr] invisible
  data-[state=open]:grid-rows-[1fr] data-[state=open]:visible
  transition-[grid-template-rows,opacity,visibility] duration-200! ease-out
  motion-reduce:transition-none
  opacity-0 data-[state=open]:opacity-100
`;
