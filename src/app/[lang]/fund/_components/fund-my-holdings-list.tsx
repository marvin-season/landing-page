"use client";

import { Bookmark, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useFundHoldings,
  useFundHoldingsStore,
} from "@/store/fund-holdings-store";

export function FundMyHoldingsList() {
  const holdings = useFundHoldings();
  const removeHolding = useFundHoldingsStore((s) => s.removeHolding);
  const router = useRouter();

  const params = useParams();
  const selectedCode = params.code as string | null;
  if (holdings.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="size-4" />
          My Holdings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {holdings.map((h) => (
            <li
              key={h.code}
              className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <button
                type="button"
                onClick={() => {
                  router.push(`/fund/${h.code}`);
                }}
                className={cn(
                  "flex-1 truncate text-left text-sm",
                  selectedCode === h.code && "font-medium text-blue-500",
                )}
              >
                <span className="text-muted-foreground">{h.code}</span>
                <span className="ml-2 truncate">{h.name || h.code}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  removeHolding(h.code);
                }}
                aria-label={`Remove ${h.code}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
