"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch(props: SwitchProps) {
  const {
    className,
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    ...rest
  } = props;

  const [uncontrolled, setUncontrolled] = React.useState(!!defaultChecked);
  const isControlled = typeof checked === "boolean";
  const isOn = isControlled ? checked : uncontrolled;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={(e) => {
        rest.onClick?.(e);
        if (disabled) return;
        const next = !isOn;
        if (!isControlled) setUncontrolled(next);
        onCheckedChange?.(next);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-slate-200 bg-slate-200 transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        isOn && "bg-primary border-primary",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
          isOn && "translate-x-5.5",
        )}
      />
    </button>
  );
}
