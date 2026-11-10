"use client";

import { useChatStreamCore } from "@landing-page/utils/stream";
import { useCallback, useEffect, useRef, useState } from "react";
import { worldRequest, worldStoryStream } from "@/lib/group-chat/client";
import type { RunInput, WorldMessage, WorldRoom } from "@/lib/group-chat/model";

function mergeRoom(previous: WorldRoom | null, next: WorldRoom) {
  if (!previous || previous.id !== next.id) return next;
  if (next.version < previous.version || next.updatedAt < previous.updatedAt)
    return previous;
  if (
    next.run?.id === previous.run?.id &&
    next.run?.status === "running" &&
    previous.run?.status !== "running"
  )
    return previous;
  const before = next.messages[0]?.seq ?? 0;
  return {
    ...next,
    messages: [
      ...previous.messages.filter((m) => m.seq < before),
      ...next.messages,
    ],
  };
}
export function useWorldRoom(roomId: string, onAccepted: () => void) {
  const [room, setRoom] = useState<WorldRoom | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [phase, setPhase] = useState("");
  const busyRef = useRef(false);
  const pendingRef = useRef(false);
  const stoppingRef = useRef(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const accepted = useRef(false);
  const lastCommand = useRef<RunInput | null>(null);
  const requestId = useRef<string | undefined>(undefined);
  const refresh = useCallback(async () => {
    const requestEpoch = epoch.current;
    try {
      const data = await worldRequest<{ room: WorldRoom }>(`rooms/${roomId}`);
      if (
        mounted.current &&
        !busyRef.current &&
        !pendingRef.current &&
        requestEpoch === epoch.current
      )
        setRoom((old) => mergeRoom(old, data.room));
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "读取失败");
    }
  }, [roomId]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (!busyRef.current && document.visibilityState === "visible")
        void refresh();
    }, 4000);
    const focus = () => {
      if (!busyRef.current) void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const stream = useChatStreamCore({
    adapter: worldStoryStream,
    onStart: () => {
      epoch.current += 1;
      pendingRef.current = true;
      busyRef.current = true;
      setBusy(true);
      setPending(true);
      setError("");
      sequence.current = 0;
      accepted.current = false;
      setPhase("正在连接…");
    },
    onEvent: (event) => {
      if (event.eventSeq <= sequence.current) return;
      sequence.current = event.eventSeq;
      if (event.type === "request") {
        requestId.current = event.clientRequestId;
        pendingRef.current = true;
        setPending(true);
        setPhase("正在安排下一位角色…");
      } else if (event.type === "room") {
        setRoom((old) => mergeRoom(old, event.room));
        pendingRef.current = false;
        setPending(false);
        if (!accepted.current) {
          accepted.current = true;
          onAccepted();
        }
      } else if (event.type === "phase") setPhase(event.phase);
      else if (event.type === "message")
        setRoom((old) =>
          old
            ? {
                ...old,
                messages: old.messages.some((m) => m.id === event.message.id)
                  ? old.messages.map((m) =>
                      m.id === event.message.id ? event.message : m,
                    )
                  : [...old.messages, event.message],
              }
            : old,
        );
      else if (event.type === "delta")
        setRoom((old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === event.messageId
                    ? { ...m, text: m.text + event.text }
                    : m,
                ),
              }
            : old,
        );
      else if (event.type === "error") setError(event.message);
    },
    onComplete: () => {
      pendingRef.current = false;
      busyRef.current = false;
      setBusy(false);
      setPending(false);
      void refresh();
    },
    onError: (message) => {
      pendingRef.current = false;
      busyRef.current = false;
      setBusy(false);
      setPending(false);
      setError(message);
      void refresh();
    },
  });
  function start(
    command: Omit<RunInput, "clientRequestId" | "expectedVersion">,
  ) {
    if (!room || pendingRef.current) return;
    lastCommand.current = {
      ...command,
      clientRequestId: crypto.randomUUID(),
      expectedVersion: room.version,
    };
    requestId.current = lastCommand.current.clientRequestId;
    stream.send({ roomId, command: lastCommand.current });
  }
  async function stop() {
    if (stoppingRef.current) return;
    const runId = pendingRef.current ? undefined : room?.run?.id;
    stoppingRef.current = true;
    setStopping(true);
    lastCommand.current = null;
    epoch.current += 1;
    pendingRef.current = true;
    stream.stop();
    busyRef.current = false;
    setBusy(false);
    setPending(true);
    setPhase("正在暂停…");
    try {
      const data = await worldRequest<{ room: WorldRoom }>(
        `rooms/${roomId}/stop`,
        "POST",
        { runId, clientRequestId: requestId.current },
      );
      if (mounted.current) setRoom((old) => mergeRoom(old, data.room));
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "暂停失败");
    } finally {
      pendingRef.current = false;
      stoppingRef.current = false;
      if (mounted.current) {
        setPending(false);
        setStopping(false);
        void refresh();
      }
    }
  }
  async function loadEarlier() {
    const before = room?.messages[0]?.seq;
    if (!before) return;
    try {
      const data = await worldRequest<{ messages: WorldMessage[] }>(
        `rooms/${roomId}/messages?before=${before}`,
      );
      setRoom((old) =>
        old
          ? {
              ...old,
              messages: [
                ...data.messages.filter(
                  (m) => !old.messages.some((existing) => existing.id === m.id),
                ),
                ...old.messages,
              ],
            }
          : old,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }
  return {
    room,
    setRoom,
    error,
    setError,
    busy,
    pending,
    stopping,
    phase,
    refresh,
    start,
    stop,
    loadEarlier,
    retrySubmission:
      !stopping && !accepted.current && lastCommand.current
        ? () => stream.send({ roomId, command: lastCommand.current! })
        : undefined,
  };
}
