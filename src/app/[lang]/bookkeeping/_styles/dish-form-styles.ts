import { cls } from "./layout";

export const dishGridCls = cls`grid grid-cols-2 gap-x-3 gap-y-2.5 min-w-0 items-end`;
export const dishFieldCls = cls`flex min-w-0 flex-col gap-1`;
export const fieldLabelCls = cls`text-muted-foreground text-xs leading-4 wrap-anywhere`;
export const dishHintCls = cls`text-muted-foreground text-xs leading-relaxed mb-3`;
export const dishInputCls = cls`
  w-full min-w-0 rounded-lg border bg-card shadow-none h-9 px-2 text-base
  focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50
  focus-visible:ring-offset-0 placeholder:text-sm text-card-foreground
  border-border/60 focus-visible:border-primary/50
  placeholder:text-muted-foreground/70 placeholder:font-normal placeholder:opacity-100
  dark:bg-card shinchan:bg-card apple:rounded-lg apple:bg-card apple:backdrop-blur-none
`;
export const dishTagControlCls = cls`
  rounded-lg border border-border/60 bg-card shadow-none hover:bg-muted/40 hover:shadow-none
  focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 focus-visible:ring-offset-0
  shinchan:rounded-lg shinchan:bg-card apple:rounded-lg apple:bg-card apple:backdrop-blur-none
`;

// 仅统一常用项目页的控件底色和标签色，不改变共享组件在其他页面的配色。
export const menuColorsCls = cls`
  [&_[data-slot=input]]:bg-card [&_[data-slot=select-trigger]]:bg-card
  [&_[data-slot=item-tag]]:bg-secondary/50
  [&_[data-slot=item-tag]]:text-secondary-foreground!
  [&_[data-slot=item-tag]]:border-border!
`;
