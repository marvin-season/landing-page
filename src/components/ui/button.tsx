"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800",
        outline:
          "border border-slate-200/60 bg-white/60 text-slate-900 shadow-sm hover:shadow-md hover:bg-white hover:text-slate-950",
        ghost:
          "bg-transparent text-slate-900 hover:bg-slate-100 hover:text-slate-950",
        soft: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        subtle:
          "bg-slate-900/10 text-slate-900 hover:bg-slate-900/20 hover:text-slate-950",
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
  ref?: React.RefObject<HTMLButtonElement | null>;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant,
  size,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    ></button>
  );
};
Button.displayName = "Button";

export { Button, buttonVariants };
