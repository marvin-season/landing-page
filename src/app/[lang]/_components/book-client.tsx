"use client";

import { MotionDiv } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Phase } from "@/types/chapter";
export const variants: Record<Phase, Record<string, number>> = {
  cover: {
    rotateY: 0,
    rotateX: 12,
    rotateZ: -2,
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    opacity: 1,
  },
  content: {
    rotateY: -135,
    rotateX: 10,
    rotateZ: -4,
    x: -10,
    y: -16,
    z: 0,
    scale: 1,
    opacity: 1,
  },
};

type BookClientProps = {
  phase?: Phase;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const BookClient: React.FC<BookClientProps> = ({
  phase = "closed",
  className,
  children,
}) => {
  return (
    <MotionDiv
      className={cn(
        "group relative h-[320px] w-[240px] rounded-[32px] sm:h-[360px] sm:w-[280px]",
        className,
      )}
      style={{
        transformStyle: "preserve-3d",
      }}
      variants={variants}
      animate={phase}
      whileHover={{ translateY: -6 }}
      transition={{
        duration: 1,
      }}
    >
      {children}
    </MotionDiv>
  );
};

export default BookClient;
