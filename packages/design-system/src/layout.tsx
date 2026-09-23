import { cn } from "@landing-page/utils";
import {
  Children,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export type LayoutDirection = "vertical" | "horizontal";

export type LayoutProps = DivProps & {
  direction?: LayoutDirection;
};

export type LayoutSiderProps = HTMLAttributes<HTMLElement> & {
  side?: "left" | "right";
  width?: number | string;
  collapsed?: boolean;
  collapsedWidth?: number | string;
};

function toCssSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

function isLayoutSider(node: ReactNode) {
  return isValidElement(node) && node.type === LayoutSider;
}

function Layout({ className, direction, children, ...props }: LayoutProps) {
  const resolvedDirection =
    direction ??
    (Children.toArray(children).some(isLayoutSider)
      ? "horizontal"
      : "vertical");

  return (
    <div
      data-slot="layout"
      data-direction={resolvedDirection}
      className={cn(
        "flex min-h-0 w-full flex-1 overflow-hidden relative",
        resolvedDirection === "horizontal" ? "flex-row" : "flex-col",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function LayoutHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <header
      data-slot="layout-header"
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-md absolute inset-x-0 top-0 z-10",
        className,
      )}
      {...props}
    />
  );
}

function LayoutSider({
  className,
  side = "left",
  width = 240,
  collapsed = false,
  collapsedWidth = 64,
  style,
  ...props
}: LayoutSiderProps) {
  const resolvedWidth = collapsed ? collapsedWidth : width;

  return (
    <aside
      data-slot="layout-sider"
      data-side={side}
      data-collapsed={collapsed || undefined}
      className={cn(
        "flex shrink-0 flex-col overflow-auto bg-background",
        side === "right"
          ? "order-last border-s border-border/60"
          : "border-e border-border/60",
        className,
      )}
      style={{ width: toCssSize(resolvedWidth), ...style }}
      {...props}
    />
  );
}

function LayoutContent({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="layout-content"
      className={cn("min-h-0 min-w-0 flex-1 overflow-auto", className)}
      {...props}
    />
  );
}

function LayoutFooter({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <footer
      data-slot="layout-footer"
      className={cn(
        "flex shrink-0 items-center border-t border-border/60 bg-background px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

const LayoutCompound = Object.assign(Layout, {
  Header: LayoutHeader,
  Sider: LayoutSider,
  Content: LayoutContent,
  Footer: LayoutFooter,
});

export {
  LayoutCompound as Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  LayoutSider,
};
