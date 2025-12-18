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
  /** 头部标题 */
  title?: React.ReactNode;
  /** 头部描述 */
  description?: React.ReactNode;
  /** 底部区域（常用于按钮组） */
  footer?: React.ReactNode;
  /** 抽屉主体内容 */
  children?: React.ReactNode;

  /** 传给 SheetContent 的 className */
  contentClassName?: string;
  /** 传给 SheetHeader 的 className */
  headerClassName?: string;
  /** 传给 DrawerBody 的 className */
  bodyClassName?: string;
  /** 传给 SheetFooter 的 className */
  footerClassName?: string;
};

export function Drawer({
  trigger,
  side = "right",
  title,
  description,
  footer,
  children,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  ...sheetProps
}: DrawerProps) {
  const hasHeader = Boolean(title || description);

  return (
    <Sheet {...sheetProps}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}

      <SheetContent side={side} className={contentClassName}>
        {hasHeader ? (
          <SheetHeader className={headerClassName}>
            {title ? <SheetTitle>{title}</SheetTitle> : null}
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
        ) : null}

        {children ? (
          <DrawerBody
            className={cn(
              "p-4",
              hasHeader ? "pt-0" : null,
              // 让 body 可滚动（header/footer 固定）
              "min-h-0 flex-1 overflow-auto",
              bodyClassName,
            )}
          >
            {children}
          </DrawerBody>
        ) : null}

        {footer ? (
          <SheetFooter className={footerClassName}>{footer}</SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export type DrawerBodyProps = React.ComponentProps<"div">;

export function DrawerBody({ className, ...props }: DrawerBodyProps) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("grid gap-4", className)}
      {...props}
    />
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
