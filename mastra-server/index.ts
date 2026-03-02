import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import {
  DefaultExporter,
  Observability,
  SensitiveDataFilter
} from "@mastra/observability";
import { AgentConstant } from "~/mastra-server/constant";
import { storage } from "~/mastra-server/storage";
import { generalAgent } from "./agents/general-agent";
import { weatherWorkflow } from "./workflows/weather-workflow";

export const mastra = new Mastra({
  bundler: {
    externals: ["@copilotkit/runtime"],
  },
  workflows: { weatherWorkflow },
  agents: { [AgentConstant.GENERAL_AGENT]: generalAgent },
  storage,
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
