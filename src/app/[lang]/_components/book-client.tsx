"use client";

import { MotionDiv } from "@/components/ui";
import { cn } from "@/lib/utils";

type BookClientProps = {
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const BookClient: React.FC<BookClientProps> = ({ className, children }) => {
  return (
    <MotionDiv
      className={cn(
        "group relative h-[320px] w-[240px] rounded-[32px] sm:h-[360px] sm:w-[280px]",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
