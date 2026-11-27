import type { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import OpenAI from "openai";
import type { WorldAgentPurpose } from "~/mastra-server/agents/world-agents";
import { WorldError } from "./model";

export type ModelMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };
export type ModelResult = {
  text: string;
  usage?: { input: number; output: number };
};
export type Complete = (input: {
  purpose?: WorldAgentPurpose;
  sessionId?: string;
  model: string;
  messages: ModelMessage[];
  signal: AbortSignal;
  maxCharacters: number;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  onText?: (text: string) => void;
}) => Promise<ModelResult>;

const maxCompletionTimeoutMs = 180_000;

export function providerError(error: unknown): WorldError {
  if (error instanceof WorldError) return error;
  const status =
    error instanceof OpenAI.APIError
      ? error.status
      : error && typeof error === "object" && "statusCode" in error
        ? error.statusCode
        : undefined;
  if (status) {
    if (status === 401 || status === 403)
      return new WorldError(
        "proxy_auth",
        "DeepSeek 鉴权失败，请检查 DEEPSEEK_API_KEY",
        502,
      );
    if (status === 429)
      return new WorldError("rate_limit", "模型请求过于频繁，请稍后重试", 429);
    if (status === 404)
      return new WorldError(
        "model_missing",
        "模型不存在，请检查 DeepSeek 模型配置",
        502,
      );
    if (status === 400)
      return new WorldError(
        "incompatible",
        "模型拒绝了请求，请检查上下文长度及参数兼容性",
        502,
      );
  }
  return new WorldError(
    "proxy_unavailable",
    "模型连接失败或响应中断，请检查 DEEPSEEK_API_KEY 与网络",
    502,
  );
}
export function createTextCompletion(
  getAgent: (purpose: WorldAgentPurpose) => Agent | Promise<Agent> = async (
    purpose,
  ) => (await import("~/mastra-server")).mastra.getAgent(purpose),
): Complete {
  return async ({
    purpose = "actor",
    sessionId,
    model,
    messages,
    signal,
    maxCharacters,
    onText,
    timeoutMs = 60_000,
    idleTimeoutMs,
  }) => {
    const timeout = new AbortController();
    const combined = AbortSignal.any([signal, timeout.signal]);
    const budgetMs = Math.min(maxCompletionTimeoutMs, Math.max(1, timeoutMs));
    const idleBudgetMs = Math.min(
      budgetMs,
      Math.max(1, idleTimeoutMs ?? Math.min(30_000, budgetMs)),
    );
    const totalTimer = setTimeout(() => timeout.abort(), budgetMs);
    let idleTimer = setTimeout(() => timeout.abort(), idleBudgetMs);
    let text = "";
    try {
      combined.throwIfAborted();
      const agent = await getAgent(purpose);
      combined.throwIfAborted();
      const requestContext = new RequestContext<{
        model: string;
        sessionId?: string;
      }>();
      requestContext.set("model", model);
      if (sessionId) requestContext.set("sessionId", sessionId);
      const stream = await agent.stream(
        messages.filter((message) => message.role !== "system"),
        {
          instructions:
            messages
              .filter((message) => message.role === "system")
              .map((message) => message.content)
              .join("\n\n") || undefined,
          requestContext,
          abortSignal: combined,
          maxSteps: 1,
          modelSettings: { maxRetries: 0 },
          toolChoice: "none",
        },
      );
      for await (const chunk of stream.fullStream) {
        combined.throwIfAborted();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => timeout.abort(), idleBudgetMs);
        if (chunk.type === "error") throw chunk.payload.error;
        if (chunk.type.startsWith("tool-"))
          throw new WorldError(
            "tools_disabled",
            "该模型返回了工具调用，世界群聊仅支持纯文本",
            502,
          );
        if (chunk.type === "text-delta") {
          const available = maxCharacters - text.length;
          const delta = chunk.payload.text.slice(0, available);
          text += delta;
          if (delta) onText?.(delta);
          if (text.length >= maxCharacters)
            throw new WorldError(
              "truncated",
              "回复达到长度上限，已停止且不计入后续剧情",
            );
        }
      }
      combined.throwIfAborted();
      const finish = await stream.finishReason;
      if (finish !== "stop" || !text.trim())
        throw new WorldError(
          "incomplete",
          "模型未返回完整文本，请重试或选择其他模型",
          502,
        );
      const usage = await stream.totalUsage;
      return {
        text,
        usage:
          typeof usage.inputTokens === "number" &&
          typeof usage.outputTokens === "number"
            ? { input: usage.inputTokens, output: usage.outputTokens }
            : undefined,
      };
    } catch (error) {
      if (signal.aborted) throw new WorldError("stopped", "对话已停止", 409);
      if (timeout.signal.aborted)
        throw new WorldError(
          "timeout",
          purpose === "writer"
            ? "模型响应超时，请稍后重试或缩短正文"
            : "模型响应超时，已暂停对话",
          504,
        );
      throw providerError(error);
    } finally {
      clearTimeout(totalTimer);
      clearTimeout(idleTimer);
      timeout.abort();
    }
  };
}
export const completeText = createTextCompletion();
export async function listModels() {
  // world agents 固定走 DeepSeek；编辑器「获取模型」给出可选 ID，不再依赖 Magpie 代理。
  return ["deepseek/deepseek-chat", "deepseek/deepseek-reasoner"];
}
