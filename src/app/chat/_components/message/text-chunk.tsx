import { memo } from "react";
import { MotionSpan } from "@/components/ui";

function TextChunk({ text }: { text: string }) {
  return (
    <MotionSpan
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="inline-block"
    >
      {text}
    </MotionSpan>
  );
}

export const MemoTextChunk = memo(TextChunk);
