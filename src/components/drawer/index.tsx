/* eslint-disable react/no-unstable-nested-components */
"use client";

import type * as React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DrawerSide = "top" | "right" | "bottom" | "left";

export type DrawerProps = Omit<
  React.ComponentProps<typeof Sheet>,
  "children"
> & {
  /**
   * 抽屉触发器（推荐传入一个可交互的 ReactElement，例如 <Button />）
   * 内部会使用 `asChild` 包裹。
   */
  trigger?: React.ReactElement;
  /** 抽屉打开方向，默认 right */
  side?: DrawerSide;
  /** 抽屉主体内容 */
  children?: React.ReactNode;
  className?: string;
};

export function Drawer({
  trigger,
  side = "right",
  children,
  className,
  ...sheetProps
}: DrawerProps) {
  return (
    <Sheet {...sheetProps}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}

      <SheetContent side={side} className={className}>
        <SheetHeader></SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

export type DrawerBodyProps = React.ComponentProps<"div">;

export function DrawerBody({ className, ...props }: DrawerBodyProps) {
  return (
    <div data-slot="drawer-body" className={cn("grid", className)} {...props} />
  );
}

/**
 * 进阶用法：如果需要完全自定义结构，可以直接使用这些底层拼装组件。
 * 它们等价于 `@/components/ui/sheet` 的对应导出，只是换了更语义化的命名。
 */
export const DrawerTrigger = SheetTrigger;
export const DrawerClose = SheetClose;
export const DrawerContent = SheetContent;
export const DrawerHeader = SheetHeader;
export const DrawerFooter = SheetFooter;
export const DrawerTitle = SheetTitle;
export const DrawerDescription = SheetDescription;
