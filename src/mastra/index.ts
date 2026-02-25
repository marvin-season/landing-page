import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { AgentConstant } from "@/lib/constant/agent";
import { generalAgent } from "./agents/general-agent";
import { weatherWorkflow } from "./workflows/weather-workflow";

export const mastra = new Mastra({
  bundler: {
    externals: ["@copilotkit/runtime"],
  },
  workflows: { weatherWorkflow },
  agents: { [AgentConstant.GENERAL_AGENT]: generalAgent },
  storage: (() => {
    // Serverless (Vercel/Lambda) 无持久化文件系统，用内存或远程 Turso
    const isServerless =
      process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const url =
      process.env.TURSO_DATABASE_URL ??
      (isServerless ? ":memory:" : "file:./db/mastra.db");
    return new LibSQLStore({
      id: "mastra-storage",
      url,
      ...(process.env.TURSO_AUTH_TOKEN && {
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
    });
  })(),
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
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
