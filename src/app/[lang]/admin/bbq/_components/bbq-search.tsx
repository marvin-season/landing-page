"use client";

import { Button, Input } from "@landing-page/design-system";
import { Search, X } from "lucide-react";

export function BbqSearch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={label}
        autoComplete="off"
        className="h-11 w-full rounded-lg bg-background pr-12 pl-9 text-base placeholder:text-sm"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 size-11 rounded-lg"
          aria-label="清空搜索"
          onClick={() => onChange("")}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
