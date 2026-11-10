import OpenAI from "openai";
import { WorldError } from "./model";

export type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
export type ModelResult = {
  text: string;
  usage?: { input: number; output: number };
};
export type Complete = (input: {
  model: string;
  messages: ModelMessage[];
  signal: AbortSignal;
  maxCharacters: number;
  onText?: (text: string) => void;
}) => Promise<ModelResult>;

function client() {
  return new OpenAI({
    baseURL: process.env.GROUP_CHAT_BASE_URL || "http://127.0.0.1:3425/v1",
    apiKey: process.env.GROUP_CHAT_API_KEY || "magpie",
    maxRetries: 0,
    timeout: 60000,
  });
}
export function providerError(error: unknown): WorldError {
  if (error instanceof WorldError) return error;
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403)
      return new WorldError(
        "proxy_auth",
        "代理鉴权失败，请检查服务端密钥",
        502,
      );
    if (error.status === 429)
      return new WorldError("rate_limit", "代理请求过于频繁，请稍后重试", 429);
    if (error.status === 404)
      return new WorldError(
        "model_missing",
        "代理地址或模型不存在，请检查配置",
        502,
      );
    if (error.status === 400)
      return new WorldError(
        "incompatible",
        "代理拒绝了请求，请检查模型、上下文长度及纯文本参数兼容性",
        502,
      );
  }
  return new WorldError(
    "proxy_unavailable",
    "代理连接失败或响应中断，请检查本地代理是否运行",
    502,
  );
}
export function createTextCompletion(
  getClient: () => OpenAI = client,
): Complete {
  return async ({ model, messages, signal, maxCharacters, onText }) => {
    const timeout = new AbortController();
    const combined = AbortSignal.any([signal, timeout.signal]);
    const totalTimer = setTimeout(() => timeout.abort(), 60000);
    let idleTimer = setTimeout(() => timeout.abort(), 30000);
    let text = "";
    let finish: string | null = null;
    let usage: ModelResult["usage"];
    try {
      const stream = await getClient().chat.completions.create(
        {
          model,
          messages,
          stream: true,
          tool_choice: "none",
        },
        { signal: combined },
      );
      for await (const chunk of stream) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => timeout.abort(), 30000);
        const choice = chunk.choices[0];
        if (choice?.delta.tool_calls?.length || choice?.delta.function_call)
          throw new WorldError(
            "tools_disabled",
            "该模型返回了工具调用，世界群聊仅支持纯文本",
            502,
          );
        if (choice?.delta.content) {
          const available = maxCharacters - text.length;
          const delta = choice.delta.content.slice(0, available);
          text += delta;
          if (delta) onText?.(delta);
          if (text.length >= maxCharacters)
            throw new WorldError(
              "truncated",
              "回复达到长度上限，已停止且不计入后续剧情",
            );
        }
        if (choice?.finish_reason) finish = choice.finish_reason;
        if (chunk.usage)
          usage = {
            input: chunk.usage.prompt_tokens,
            output: chunk.usage.completion_tokens,
          };
      }
      if (finish !== "stop" || !text.trim())
        throw new WorldError(
          "incomplete",
          "模型未返回完整文本，请重试或选择其他模型",
          502,
        );
      return { text, usage };
    } catch (error) {
      if (signal.aborted) throw new WorldError("stopped", "对话已停止", 409);
      if (timeout.signal.aborted)
        throw new WorldError("timeout", "模型响应超时，已暂停对话", 504);
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
  try {
    const result = await client().models.list({
      signal: AbortSignal.timeout(10000),
    });
    return result.data.map((model) => model.id);
  } catch (error) {
    throw providerError(error);
  }
}
