"use client";

import { randomUUID } from "@copilotkit/react-core/v2";
import { useCallback } from "react";
import { SuggestionsList } from "@/app/agui/_components/SuggestionsList";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { MessageList } from "../_components/MessageList";
import { useCurrentAgent } from "../store";

function Chat() {
  const agent = useCurrentAgent((state) => state.agent);

  const handleSubmit = useCallback(
    async (input: string) => {
      if (!input.trim() || agent.isRunning) return;

      agent.addMessage({
        id: randomUUID(),
        role: "user",
        content: input,
      });

      await agent.runAgent(undefined, {
        onRunFinishedEvent: () => {
          console.log("agent", agent);
        },
        onRunErrorEvent: ({ event }) => {
          console.error("Agent error:", event.message);
        },
      });
    },
    [agent],
  );

  return (
    <div className="w-full p-6 relative size-full h-[80dvh]">
      <div className="flex flex-col h-full">
        <MessageList />
        <SuggestionsList onSuggestionClick={handleSubmit} />

        <PromptInput
          onSubmit={(msg) => {
            console.log("msg", msg);
            handleSubmit(msg.text);
          }}
          className="mt-20"
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="md:leading-10"
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
