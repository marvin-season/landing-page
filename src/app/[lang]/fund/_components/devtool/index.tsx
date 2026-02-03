import { CircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFundHoldingsStore } from "@/store/fund-holdings-store";
import { Trend } from "./trend";

export function DevTool() {
  const clearPoints = useFundHoldingsStore((state) => state.clearPoints);
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CircleIcon className="size-4 animate-spin text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <Button
              onClick={() => {
                clearPoints("022365");
              }}
            >
              clear points
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Trend />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
