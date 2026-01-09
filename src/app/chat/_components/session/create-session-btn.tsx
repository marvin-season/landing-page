"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

export function CreateSessionBtn(props: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;
  const trpc = useTRPC();
  const { data: defaultModel } = useQuery(
    trpc.model.defaultModel.queryOptions(),
  );
  const router = useRouter();
  const { createNewSession } = useSessionStore();
  return (
    <Tooltip content="Create a new session">
      <Button
        type="button"
        variant="outline"
        className={cn("truncate", className)}
        onClick={() => {
          const id = createNewSession({ model: defaultModel });
          router.push(`/chat/${id}`);
        }}
      >
        {children || (
          <>
            <Plus className="size-4 shrink-0" />
            New Session
          </>
        )}
      </Button>
    </Tooltip>
  );
}
