"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session-store";

export function CreateSessionBtn(props: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;

  const router = useRouter();
  const { createNewSession } = useSessionStore();
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => {
        const id = createNewSession();
        router.push(`/chat/${id}`);
      }}
    >
      {children || (
        <>
          <Plus className="size-4" />
          开始新对话
        </>
      )}
    </Button>
  );
}
