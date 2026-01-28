"use client";

import { HttpAgent, type Message, randomUUID } from "@ag-ui/client";
import { useState } from "react";

// 创建 HttpAgent 实例，直接连接到后端服务器
const agent = new HttpAgent({
  url: "http://localhost:7777/agui",
});

export default function Page() {
  const [input, setInput] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");

  const handleSend = async () => {
    if (!input.trim() || agent.isRunning) return;

    const userMessage: Message = {
      id: randomUUID(),
      role: "user",
      content: input.trim(),
    };

    agent.addMessage(userMessage);
    setInput("");
    setCurrentResponse("");

    try {
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
    } catch (error) {
      console.error("Failed to run agent:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        <div className="p-3 rounded-lg bg-gray-100 mr-auto max-w-[80%]">
          <div className="text-sm font-semibold mb-1">助手</div>
          <div className="text-gray-800">{currentResponse}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="输入消息... (例如: hello)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={agent.isRunning}
        />
        <button
          onClick={handleSend}
          disabled={agent.isRunning || !input.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          发送
        </button>
      </div>
    </div>
  );
}
