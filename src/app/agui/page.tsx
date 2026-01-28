"use client";

import { randomUUID, useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useState } from "react";

export default function Page() {
  const { agent } = useAgent({
    agentId: "my_agent",
  });
  useEffect(() => {
    console.log(agent.isRunning);
  }, [agent.isRunning]);
  const [currentResponse, setCurrentResponse] = useState("");
  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <button
        onClick={async () => {
          if (agent.isRunning) return;
          agent.addMessage({
            id: randomUUID(),
            role: "user",
            content: "Hello, world!",
          });
          await agent.runAgent(undefined, {
            onTextMessageContentEvent: ({ event }) => {
              console.log("Text message content:", event);
              // 实时更新流式内容
              setCurrentResponse((prev) => prev + event.delta);
            },
            onTextMessageEndEvent: ({ messages }) => {
              console.log("Text message end:", messages);
            },
            onRunErrorEvent: ({ event }) => {
              console.error("Agent error:", event.message);
            },
            onRunFinishedEvent: ({ messages }) => {
              console.log("Run finished:", messages);
            },
          });
        }}
      >
        Start
      </button>
      <div className="text-gray-800">{currentResponse}</div>
    </main>
  );
}
