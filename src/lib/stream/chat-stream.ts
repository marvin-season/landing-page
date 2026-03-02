import type { UIMessageChunk } from "ai";
import { Observable } from "rxjs";
import { buildSubmitMessageBody } from "@/lib/chat/api";

export type TInputParams = {
  url: string;
  text: string;
  threadId: string;
};

/** 将 SSE 流转换为 Observable（事件类型与 ai 包 UIMessageChunk 一致） */
export function createObservableStream({
  url,
  text,
  threadId,
}: TInputParams): Observable<UIMessageChunk> {
  const body = buildSubmitMessageBody({ threadId, text });
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
              const event = JSON.parse(raw) as UIMessageChunk;
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
