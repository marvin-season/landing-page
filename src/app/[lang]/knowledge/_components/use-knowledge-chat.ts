"use client";

import { useLingui } from "@lingui/react/macro";
import { useCallback, useRef, useState } from "react";
import type { TInputParams } from "@/lib/stream/chat-request";
import {
  type ChatStreamAdapter,
  defaultChatStreamAdapter,
} from "@/lib/stream/chat-stream-adapter";
import {
  type ChatStreamState,
  chatStreamText,
} from "@/lib/stream/chat-stream-state";
import {
  type MockChatInput,
  mockChatStreamAdapter,
} from "@/lib/stream/mock-chat-stream-adapter";
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

type KnowledgeChatInput =
  | { mode: "ai"; input: TInputParams }
  | { mode: "mock"; input: MockChatInput };

const knowledgeChatAdapter: ChatStreamAdapter<KnowledgeChatInput> = (
  request,
  context,
) =>
  request.mode === "ai"
    ? defaultChatStreamAdapter(request.input, context)
    : mockChatStreamAdapter(request.input, context);

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
  const lastSendRef = useRef<KnowledgeChatInput | null>(null);
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
    adapter: knowledgeChatAdapter,
    onComplete: onStreamComplete,
  });
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

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
      const input: KnowledgeChatInput = aiReply
        ? {
            mode: "ai",
            input: {
              url: "/api/knowledge/chat",
              threadId: threadIdRef.current,
              text,
              messages: THROTTLE
                ? undefined
                : toKnowledgeChatMessages(nextMessages),
            },
          }
        : { mode: "mock", input: { text: instruction.trim() || text } };
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
