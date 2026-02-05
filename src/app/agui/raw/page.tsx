"use client";

import { type Message, randomUUID } from "@ag-ui/client";
import { useState } from "react";
import { addMessageToAgent, invokeAgent } from "@/app/agui/raw/action";
import ConversationPanel from "../_components/ConversationPanel";

// 创建 HttpAgent 实例，直接连接到后端服务器

export default function Page() {
  const [input, setInput] = useState("");
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: randomUUID(),
      role: "user",
      content: input.trim(),
    };

    addMessageToAgent(userMessage);
    setInput("");

    try {
      await invokeAgent();
    } catch (error) {
      console.error("Failed to run agent:", error);
    }
  };

  return (
    <div className="flex flex-col h-[80dvh] max-w-4xl mx-auto p-4">
      <ConversationPanel messages={[]} />

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="输入消息... (例如: hello)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          // disabled={agent.isRunning}
        />
        <button
          onClick={handleSend}
          // disabled={agent.isRunning || !input.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          发送
        </button>
      </div>
    </div>
  );
}
