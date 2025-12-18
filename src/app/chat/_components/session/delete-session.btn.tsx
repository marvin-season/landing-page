"use client";

import { Trash2 } from "lucide-react";
import { useSessionStore } from "@/store/session-store";

export function DeleteSessionBtn(props: { sessionId: string }) {
  const { sessionId } = props;
  const { deleteSession } = useSessionStore();
  return (
    <Trash2
      onClick={() => {
        deleteSession(sessionId);
      }}
      size={14}
      className="hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-md transition-colors"
    />
  );
}
