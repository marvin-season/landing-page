"use client";

import {
  AiInput,
  type AiInputHandle,
  type AiInputSubmitValue,
  type AiMentionItem,
} from "@landing-page/biz-ui";
import { Button, Switch } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  Bot,
  FileText,
  Gauge,
  Loader2,
  MessageSquare,
  Quote,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import {
  type KnowledgeChatHandle,
  useKnowledgeChat,
} from "../use-knowledge-chat";
import type { DocumentQuote, KnowledgeDocument } from "./model";
import { sampleFormatLabel } from "./samples";

export type { KnowledgeMessage } from "./model";
export type { KnowledgeChatHandle };

type KnowledgeMention =
  | { kind: "document"; documentId: string }
  | { kind: "quote"; quote: DocumentQuote };

const DocumentMarkdown = dynamic(() => import("./markdown/renderer"));

function ScrollToLatest() {
  const { t } = useLingui();
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return isAtBottom ? null : (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="absolute bottom-3 left-1/2 size-8 -translate-x-1/2 bg-card"
      aria-label={t`Scroll to latest message`}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="size-4" />
    </Button>
  );
}

function QuoteBlock({
  quote,
  onLocate,
}: {
  quote: DocumentQuote;
  onLocate: (quote: DocumentQuote) => void;
}) {
  return (
    <blockquote className="rounded-r-lg border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-xs leading-5">
      <button
        type="button"
        className="block w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onLocate(quote)}
      >
        <span className="mb-1 flex max-w-full items-center gap-1.5 text-primary hover:underline">
          <Quote className="size-3 shrink-0" />
          <span className="truncate">{quote.documentName}</span>
          {quote.pageNumber ? (
            <span className="shrink-0">
              · <Trans>Page {quote.pageNumber}</Trans>
            </span>
          ) : null}
        </span>
        <span className="max-h-32 overflow-y-auto whitespace-pre-wrap wrap-break-word text-muted-foreground block">
          {quote.text}
        </span>
      </button>
    </blockquote>
  );
}

export function DocumentChat({
  ref,
  document: source,
  notice,
  onLocate,
  onBusyChange,
}: {
  ref?: Ref<KnowledgeChatHandle>;
  document: KnowledgeDocument;
  notice?: string;
  onLocate: (quote: DocumentQuote) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useLingui();
  const reducedMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const [mentions, setMentions] = useState<AiMentionItem<KnowledgeMention>[]>(
    [],
  );
  const inputRef = useRef<AiInputHandle>(null);
  const {
    messages,
    quote,
    setQuote,
    aiReply,
    setAiReply,
    ask,
    retry,
    stop,
    loading: busy,
    error,
    streamingText,
    throttle,
  } = useKnowledgeChat(source);
  const quoteId = quote?.id;

  useImperativeHandle(ref, () => ({ ask, setQuote }), [ask, setQuote]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (quoteId) inputRef.current?.focus({ preventScroll: true });
  }, [quoteId]);

  const mentionItems = useMemo(() => {
    const items: AiMentionItem<KnowledgeMention>[] = [
      {
        id: `document:${source.id}`,
        label: source.file.name,
        description: sampleFormatLabel(source.kind),
        icon: <FileText />,
        data: { kind: "document", documentId: source.id },
      },
    ];
    const seen = new Set<string>();
    for (const message of messages) {
      const cited = message.quote;
      if (!cited || seen.has(cited.id) || cited.id === quoteId) continue;
      seen.add(cited.id);
      items.push({
        id: `quote:${cited.id}`,
        label: cited.documentName,
        description: cited.pageNumber
          ? `${t`Page ${cited.pageNumber}`} · ${cited.text.slice(0, 48)}`
          : cited.text.slice(0, 64),
        icon: <Quote />,
        data: { kind: "quote", quote: cited },
      });
    }
    return items;
  }, [messages, quoteId, source, t]);

  function submitComposer({ text }: AiInputSubmitValue<KnowledgeMention>) {
    if ((!text && !quote) || busy) return;
    ask(text, quote);
    setInput("");
    setMentions([]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card/50">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-4">
        <MessageSquare className="size-4 text-primary" />
        <h2 className="text-sm font-medium">
          <Trans>Document chat</Trans>
        </h2>
        <div className="ml-auto flex h-8 items-center gap-2">
          {aiReply ? (
            <Button
              disabled
              title={t`Default throttle mode, cannot be changed`}
              type="button"
              size="sm"
              variant={throttle ? "subtle" : "outline"}
              aria-pressed={throttle}
              aria-label={
                throttle
                  ? t`Throttle on. Only the current question is sent.`
                  : t`Throttle off. The full conversation is sent.`
              }
            >
              <Gauge className="size-3.5" />
              <Trans>Throttle</Trans>
            </Button>
          ) : null}
          <label className="flex h-8 shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <span>
              <Trans>AI reply</Trans>
            </span>
            <Switch checked={aiReply} onCheckedChange={setAiReply} />
          </label>
        </div>
      </div>
      <StickToBottom
        className="relative min-h-0 flex-auto overflow-hidden"
        initial={reducedMotion ? "instant" : "smooth"}
        resize={reducedMotion ? "instant" : "smooth"}
      >
        <StickToBottom.Content className="flex min-h-full flex-col gap-5 p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary">
                <Bot className="size-6" />
              </div>
              <h3 className="text-lg font-medium">
                <Trans>A conversation with your document</Trans>
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                <Trans>
                  Ask a question, or select a passage on the left and quote it
                  here.
                </Trans>
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto w-full max-w-[92%] space-y-3 rounded-2xl rounded-tr-sm bg-muted/70 p-4"
                    : "mr-auto w-full space-y-3 py-2"
                }
              >
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {message.role === "user" ? (
                    <Trans>You</Trans>
                  ) : (
                    <>
                      <Bot className="size-3.5" />
                      <Trans>Assistant</Trans>
                    </>
                  )}
                </p>
                {message.quote ? (
                  <QuoteBlock quote={message.quote} onLocate={onLocate} />
                ) : null}
                {message.text ? (
                  message.role === "user" ? (
                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">
                      {message.text}
                    </p>
                  ) : (
                    <DocumentMarkdown content={message.text} />
                  )
                ) : null}
              </div>
            ))
          )}
          {busy ? (
            streamingText ? (
              <div className="mr-auto w-full space-y-3 py-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Bot className="size-3.5" />
                  <Trans>Assistant</Trans>
                </p>
                <DocumentMarkdown content={streamingText} />
              </div>
            ) : (
              <p
                className="flex items-center gap-2 text-xs text-muted-foreground"
                role="status"
              >
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                <Trans>Thinking…</Trans>
              </p>
            )
          ) : null}
        </StickToBottom.Content>
        <ScrollToLatest />
      </StickToBottom>
      <div className="shrink-0 space-y-3 border-t border-border/60 p-4">
        <p className="text-xs leading-5 text-muted-foreground">
          <Trans>
            The assistant only receives the quoted passage and your instruction.
          </Trans>
        </p>
        {error ? (
          <div
            className="flex items-center justify-between gap-3 text-xs text-destructive"
            role="alert"
          >
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={retry}
            >
              <Trans>Retry</Trans>
            </Button>
          </div>
        ) : null}
        {notice ? (
          <p className="text-xs leading-5 text-muted-foreground" role="status">
            {notice}
          </p>
        ) : null}
        <AiInput
          ref={inputRef}
          value={input}
          onValueChange={setInput}
          mentions={mentions}
          onMentionsChange={(next) => {
            const quoteMention = next.find(
              (mention) => mention.data?.kind === "quote",
            )?.data;
            if (quoteMention?.kind === "quote") {
              setQuote(quoteMention.quote);
              setMentions(
                next.filter((mention) => mention.data?.kind !== "quote"),
              );
              return;
            }
            setMentions(next);
          }}
          mentionItems={mentionItems}
          placeholder={
            quote ? t`Ask about this passage…` : t`Ask about your document…`
          }
          label={t`Message`}
          emptyMentionLabel={t`No matches`}
          sendLabel={t`Send message`}
          stopLabel={t`Stop response`}
          removeMentionLabel={t`Remove`}
          loading={busy}
          canSubmit={Boolean(input.trim() || quote)}
          onStop={stop}
          onSubmit={submitComposer}
          header={
            quote ? (
              <div className="relative mb-3 pr-6">
                <QuoteBlock quote={quote} onLocate={onLocate} />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 size-6"
                  aria-label={t`Remove quote`}
                  onClick={() => setQuote(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : null
          }
          footer={
            <Trans>
              Enter to send · Shift + Enter for a new line · @ to mention
            </Trans>
          }
        />
      </div>
    </div>
  );
}
