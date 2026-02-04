"use client";

import { randomUUID, useAgent } from "@copilotkit/react-core/v2";
import { use, useCallback, useState } from "react";
import { AgentContext } from "@/app/agui/_components/AgentProvider";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ConversationPanel } from "./_components/ConversationPanel";

function Chat() {
  const [input, setInput] = useState<string>("");
  const { currentAgent } = use(AgentContext);

  const { agent } = useAgent({
    agentId: currentAgent,
  });

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || agent.isRunning) return;

    agent.addMessage({
      id: randomUUID(),
      role: "user",
      content: input,
    });

    setInput("");

    await agent.runAgent(undefined, {
      onRunFinishedEvent: () => {
        console.log("agent", agent);
      },
      onRunErrorEvent: ({ event }) => {
        console.error("Agent error:", event.message);
      },
    });
  }, [input, agent]);

  return (
    <div className="w-full p-6 relative size-full h-[80dvh]">
      <div className="flex flex-col h-full">
        <ConversationPanel messages={agent.messages} />
        <Suggestions>
          <Suggestion
            suggestion="hello"
            onClick={() => {
              setInput("hello");
              handleSubmit();
            }}
          >
            Hello
          </Suggestion>
        </Suggestions>

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
