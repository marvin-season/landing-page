import { Textarea } from "@landing-page/design-system";
import type { ComponentProps } from "react";

export function WritingInstructions({
  label,
  plain,
  ...props
}: Omit<
  ComponentProps<"textarea">,
  "className" | "rows" | "maxLength" | "name"
> & {
  label: string;
  plain?: boolean;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <Textarea
        {...props}
        variant={plain ? "plain" : undefined}
        name="requirements"
        rows={2}
        maxLength={4000}
        className="resize-none px-2.5 leading-5"
      />
    </label>
  );
}
