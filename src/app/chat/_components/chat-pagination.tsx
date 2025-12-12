import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ChatPaginationProps {
  className?: string;
  onPageChange: (direction: "previous" | "next") => void;
}

export function ChatPagination(props: ChatPaginationProps) {
  const { className, onPageChange } = props;
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-slate-200 bg-white/70 shadow-xs backdrop-blur-md",
        className,
      )}
    >
      <Button
        className="rounded-none"
        variant="ghost"
        size="sm"
        aria-label="Previous Page"
        onClick={() => onPageChange("previous")}
      >
        <ChevronUpIcon size={16} />
      </Button>
      <div className="h-6 w-px bg-slate-200/70" />
      <Button
        className="rounded-none"
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Next Page"
        onClick={() => onPageChange("next")}
      >
        <ChevronDownIcon size={16} />
      </Button>
    </div>
  );
}
