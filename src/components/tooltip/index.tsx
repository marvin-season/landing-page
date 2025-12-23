"use client";
import type { Trigger } from "@radix-ui/react-tooltip";
import type { ComponentProps, ReactNode } from "react";

type TTrigger = ComponentProps<typeof Trigger>;

import {
  TooltipContent,
  Tooltip as TooltipPrimitive,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export type TooltipProps = {
  content: ReactNode;
} & TTrigger;

export default function Tooltip(props: TooltipProps) {
  const { content, ...restProps } = props;
  return (
    <TooltipPrimitive>
      <TooltipTrigger {...restProps} />
      <TooltipContent>{content}</TooltipContent>
    </TooltipPrimitive>
  );
}
