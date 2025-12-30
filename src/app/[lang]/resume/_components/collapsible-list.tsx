"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { MotionDiv } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface CollapsibleListProps {
  title: React.ReactNode;
  items: string[];
  defaultExpanded?: boolean;
  className?: string;
}

export function CollapsibleList({
  title,
  items,
  defaultExpanded = false,
  className,
}: CollapsibleListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-semibold mb-2 text-foreground hover:text-primary transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      <MotionDiv
        initial={false}
        animate={{
          height: expanded ? "auto" : 0,
          opacity: expanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </MotionDiv>
    </div>
  );
}
