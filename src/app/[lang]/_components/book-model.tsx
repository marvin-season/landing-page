"use client";

import { MotionDiv } from "@/components/ui";
import { bookVariants } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";
import type { Phase } from "@/types/chapter";

type BookModelProps = {
  phase?: Phase;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const BookModel: React.FC<BookModelProps> = ({
  phase = "closed",
  interactive = false,
  className,
  children,
}) => {
  return (
    <MotionDiv
      className={cn(
        "group relative h-[320px] w-[240px] rounded-[32px] sm:h-[360px] sm:w-[280px]",
        interactive ? "cursor-pointer" : "cursor-default",
        className,
      )}
      style={{
        transformStyle: "preserve-3d",
      }}
      variants={bookVariants}
      animate={phase}
      initial={false}
      whileHover={interactive ? { translateY: -6 } : undefined}
    >
      {children}
    </MotionDiv>
  );
};

export default BookModel;
