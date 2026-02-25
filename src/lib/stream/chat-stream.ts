import { Observable } from "rxjs";

/** 流式事件类型 */
export type ChatStreamEvent =
  | { type: "start"; messageId: string }
  | { type: "start-step" }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "text-done"; id?: string }
  | {
      type: "tool-input-start";
      toolCallId: string;
      toolName: string;
      dynamic?: boolean;
    }
  | { type: "tool-input-delta"; toolCallId: string; inputTextDelta: string }
  | {
      type: "tool-input-available";
      toolCallId: string;
      toolName: string;
      input: unknown;
    }
  | { type: "tool-output-available"; toolCallId: string; output: unknown }
  | { type: "finish-step" }
  | { type: "finish" }
  | { type: string; [key: string]: unknown };

/** 将 SSE 流转换为 Observable */
export function fromChatStream(
  url: string,
  body: Record<string, unknown>,
): Observable<ChatStreamEvent> {
  return new Observable((subscriber) => {
    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const decoder = new TextDecoder();
    let buffer = "";

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          subscriber.error(new Error(`HTTP ${response.status}`));
          return;
        }
        reader = response.body.getReader();
        while (!cancelled && reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const match = line.match(/^data:\s*(.+)/);
            if (!match) continue;
            const raw = match[1].trim();
            if (!raw) continue;
            try {
              const event = JSON.parse(raw) as ChatStreamEvent;
              subscriber.next(event);
            } catch {
              // 忽略非 JSON 行（如 data: [DONE]）
            }
          }
        }
        subscriber.complete();
      })
      .catch((err) => subscriber.error(err));

    return () => {
      cancelled = true;
      reader?.cancel();
    };
  });
}
