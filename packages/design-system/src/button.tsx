"use client";

import { cn } from "@landing-page/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background shinchan:rounded-xl",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 shinchan:shadow-sm apple:shadow-sm",
        outline:
          "border border-border/60 bg-card/60 text-foreground shadow-sm hover:shadow-md hover:bg-card hover:text-foreground shinchan:matte-surface shinchan:hover:shadow-sm apple:glass-surface apple:hover:shadow-sm",
        ghost:
          "bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        soft: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        subtle:
          "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        md: "h-10 px-6 text-sm",
        lg: "h-11 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  ref?: React.RefObject<HTMLButtonElement | null>;
}

const Button: React.FC<ButtonProps> = ({
  asChild = false,
  className,
  variant,
  size,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};
Button.displayName = "Button";

export { Button, buttonVariants };
