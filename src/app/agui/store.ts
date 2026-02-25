import { useAgent } from "@copilotkit/react-core/v2";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { AgentConstant } from "@/lib/constant/agent";

interface AgentStore {
  agentId: string;
  setAgentId: (agentId: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agentId: AgentConstant.GENERAL_AGENT,
  setAgentId: (agentId) => set({ agentId }),
}));

export const useCurrentAgent = <T>(
  selector: (agent: ReturnType<typeof useAgent>) => T,
) => {
  const agentId = useAgentStore((state) => state.agentId);
  const shallowSelector = useShallow(selector);
  return shallowSelector(useAgent({ agentId }));
};
