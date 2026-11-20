"use client";

import { Input, Textarea } from "@landing-page/design-system";
import type { ReactNode } from "react";
import { useId } from "react";

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength = 4000,
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          required={required}
          rows={4}
          className="min-h-24"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          required={required}
        />
      )}
      {hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
