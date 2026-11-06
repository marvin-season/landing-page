import type { UIMessageChunk } from "ai";
import { Observable } from "rxjs";

/** 读取单行 JSON data 的 SSE 流，默认事件类型为 AI SDK UIMessageChunk。 */
export function createObservableStream<TEvent = UIMessageChunk>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Observable<TEvent> {
  return new Observable((subscriber) => {
    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const decoder = new TextDecoder();
    let buffer = "";

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
      .then(async (response) => {
        if (cancelled) {
          await response.body?.cancel();
          return;
        }
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
              const event = JSON.parse(raw) as TEvent;
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
      void reader?.cancel().catch(() => {});
    };
  });
}
