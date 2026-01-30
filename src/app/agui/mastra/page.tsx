"use client";

import { randomUUID, useAgent } from "@copilotkit/react-core/v2";
import { useCallback, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { AgentConstant } from "@/lib/constant/agent";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ToolCall {
  id: string;
  name: string;
  state: "streaming" | "output-available" | "error";
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
}

function Chat() {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const { agent } = useAgent({
    agentId: AgentConstant.WEATHER_AGENT,
  });

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || agent.isRunning) return;

    const userMessage: ChatMessage = {
      id: randomUUID(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setCurrentResponse("");
    setToolCalls([]);

    agent.addMessage({
      id: userMessage.id,
      role: "user",
      content: input,
    });

    await agent.runAgent(undefined, {
      onTextMessageContentEvent: ({ event }) => {
        setCurrentResponse((prev) => prev + event.delta);
      },
      onTextMessageEndEvent: () => {
        setCurrentResponse((prev) => {
          if (prev) {
            setMessages((msgs) => [
              ...msgs,
              {
                id: randomUUID(),
                role: "assistant",
                content: prev,
              },
            ]);
          }
          return "";
        });
      },
      onToolCallStartEvent: ({ event }) => {
        setToolCalls((prev) => [
          ...prev,
          {
            id: event.toolCallId,
            name: event.toolCallName,
            state: "streaming",
            input: {},
          },
        ]);
      },
      onToolCallArgsEvent: ({ event }) => {
        setToolCalls((prev) =>
          prev.map((tc) =>
            tc.id === event.toolCallId
              ? { ...tc, input: JSON.parse(event.delta || "{}") }
              : tc,
          ),
        );
      },
      onToolCallEndEvent: ({ event }) => {
        setToolCalls((prev) =>
          prev.map((tc) =>
            tc.id === event.toolCallId
              ? { ...tc, state: "output-available" }
              : tc,
          ),
        );
      },
      onRunErrorEvent: ({ event }) => {
        console.error("Agent error:", event.message);
      },
      onRunFinishedEvent: () => {
        setCurrentResponse("");
      },
    });
  }, [input, agent]);

  return (
    <div className="w-full p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <MessageResponse>{message.content}</MessageResponse>
                </MessageContent>
              </Message>
            ))}

            {/* 流式响应 */}
            {agent.isRunning && currentResponse && (
              <Message from="assistant">
                <MessageContent>
                  <MessageResponse>{currentResponse}</MessageResponse>
                </MessageContent>
              </Message>
            )}

            {/* 工具调用 */}
            {toolCalls.map((tool) => (
              <Tool key={tool.id}>
                <ToolHeader
                  type={`tool-invocation`}
                  state={tool.state as any}
                  className="cursor-pointer"
                />
                <ToolContent>
                  <ToolInput input={tool.input || {}} />
                  <ToolOutput output={tool.output} errorText={tool.errorText} />
                </ToolContent>
              </Tool>
            ))}

            <ConversationScrollButton />
          </ConversationContent>
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-20">
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              className="md:leading-10"
              value={input}
              placeholder="Type your message..."
              disabled={agent.isRunning}
            />
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}

export default Chat;
