"use client";
import type { ReactNode } from "react";
import {
  TooltipContent,
  Tooltip as TooltipPrimitive,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
};

export default function Tooltip({ children, content }: TooltipProps) {
  return (
    <TooltipPrimitive>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </TooltipPrimitive>
  );
}
