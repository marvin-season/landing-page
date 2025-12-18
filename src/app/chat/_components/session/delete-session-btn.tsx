"use client";

import { Trash2, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { useSessionStore } from "@/store/session-store";

export function DeleteSessionBtn(props: { sessionId: string }) {
  const { sessionId } = props;
  const { deleteSession, addSession } = useSessionStore();

  return (
    <Trash2
      onClick={() => {
        const trashSession = deleteSession(sessionId);
        if (!trashSession) {
          return;
        }
        toast(`Session ${trashSession?.title} has been deleted`, {
          action: {
            label: <Undo2Icon size={"16"} />,
            onClick: () => addSession(trashSession),
          },
        });
      }}
      size={14}
      className="hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-md transition-colors"
    />
  );
}
