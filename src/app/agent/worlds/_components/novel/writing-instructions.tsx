import type { ComponentProps } from "react";

export function WritingInstructions({
  label,
  ...props
}: Omit<
  ComponentProps<"textarea">,
  "className" | "rows" | "maxLength" | "name"
> & {
  label: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <textarea
        {...props}
        name="requirements"
        rows={2}
        maxLength={4000}
        className="block w-full resize-none rounded-md border border-transparent bg-muted/45 px-2.5 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      />
    </label>
  );
}
