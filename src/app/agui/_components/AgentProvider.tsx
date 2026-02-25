"use client";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { Bot } from "lucide-react";
import { useAgentStore } from "@/app/agui/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentConstant } from "@/lib/constant/agent";

const AGENT_OPTIONS = Object.values(AgentConstant).map((agent) => ({
  value: agent,
  label: agent,
}));

export const AgentProvider = ({ children }: { children: React.ReactNode }) => {
  const agentId = useAgentStore((state) => state.agentId);
  const setAgentId = useAgentStore((state) => state.setAgentId);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent={agentId}>
      <Select value={agentId} onValueChange={setAgentId}>
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
