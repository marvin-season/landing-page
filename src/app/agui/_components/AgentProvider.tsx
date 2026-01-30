"use client";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { Bot } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentConstant } from "@/lib/constant/agent";

const AGENT_OPTIONS = [
  { value: AgentConstant.WEATHER_AGENT, label: "Weather Agent" },
  { value: AgentConstant.AGNO_AGENT, label: "Agno Agent" },
];

export const AgentProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentAgent, setCurrentAgent] = useState(AgentConstant.WEATHER_AGENT);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent={currentAgent}>
      <Select value={currentAgent} onValueChange={setCurrentAgent}>
        <SelectTrigger className="w-[180px]">
          <Bot className="size-4 text-muted-foreground" />
          <SelectValue placeholder="选择 Agent" />
        </SelectTrigger>
        <SelectContent>
          {AGENT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </CopilotKit>
  );
};
