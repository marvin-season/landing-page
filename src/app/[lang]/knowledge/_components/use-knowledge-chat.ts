"use client";

import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatStreamState,
  chatStreamText,
  type TInputParams,
} from "@/lib/stream/chat-stream-state";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import type {
  DocumentQuote,
  KnowledgeDocument,
  KnowledgeMessage,
} from "./document/model";
import { createSeededPdfQuote } from "./document/samples";
import {
  buildKnowledgePrompt,
  toKnowledgeChatMessages,
} from "./knowledge-prompt";

const THROTTLE = true;

function seedMessages(
  source: KnowledgeDocument,
  intro: string,
): KnowledgeMessage[] {
  if (source.kind !== "pdf") return [];
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: intro,
      quote: createSeededPdfQuote(source),
    },
  ];
}

export type KnowledgeChatHandle = {
  ask: (instruction: string, quote: DocumentQuote | null) => void;
  setQuote: (quote: DocumentQuote | null) => void;
};

export function useKnowledgeChat(source: KnowledgeDocument) {
  const { t } = useLingui();
  const [messages, setMessages] = useState<KnowledgeMessage[]>(() =>
    seedMessages(
      source,
      t`I pulled a passage from this document. Click it to highlight the original text.`,
    ),
  );
  const [quote, setQuote] = useState<DocumentQuote | null>(null);
  const [aiReply, setAiReply] = useState(false);
  const threadIdRef = useRef(crypto.randomUUID());
  const lastSendRef = useRef<TInputParams | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const onStreamComplete = useCallback((flushed: ChatStreamState) => {
    const text = chatStreamText(flushed).trim();
    if (!text) return;
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "assistant", text },
    ]);
  }, []);

  const { state, send, loading, error, stop } = useChatStreamState({
    onComplete: onStreamComplete,
  });
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => () => stop(), [stop]);

  const ask = useCallback(
    (instruction: string, selectedQuote: DocumentQuote | null) => {
      const text = buildKnowledgePrompt(instruction, selectedQuote?.text);
      if (!text || loadingRef.current) return;
      const userMessage: KnowledgeMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: instruction,
        quote: selectedQuote ?? undefined,
      };
      const nextMessages = [...messagesRef.current, userMessage];
      setQuote(null);
      setMessages(nextMessages);
      if (!aiReply) return;
      const input = {
        url: "/api/knowledge/chat",
        threadId: threadIdRef.current,
        text,
        messages: THROTTLE ? undefined : toKnowledgeChatMessages(nextMessages),
      };
      lastSendRef.current = input;
      send(input);
    },
    [aiReply, send],
  );

  const retry = useCallback(() => {
    if (lastSendRef.current) send(lastSendRef.current);
  }, [send]);

  return {
    messages,
    quote,
    setQuote,
    aiReply,
    setAiReply,
    ask,
    retry,
    stop,
    loading,
    error,
    streamingText: loading ? chatStreamText(state) : undefined,
    throttle: THROTTLE,
  };
}
