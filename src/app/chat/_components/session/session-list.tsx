"use client";
import { useParams } from "next/navigation";
import SessionItem from "@/app/chat/_components/session/session-item";
import { useSessionStore } from "@/store/session-store";
export function SessionList() {
  const { sessions } = useSessionStore();
  const { sessionId } = useParams();
  return sessions
    .toSorted((a, b) => b.createdAt - a.createdAt)
    .map((session) => (
      <SessionItem
        key={session.id}
        session={session}
        isSelected={sessionId === session.id}
      />
    ));
}
