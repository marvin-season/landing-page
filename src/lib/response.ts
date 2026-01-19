import { sleep } from "@/lib/utils";

export function mockResponse<T>({
  data,
  abortController,
  delay = 30,
}: {
  data: T[];
  abortController?: AbortController;
  delay?: number;
}) {
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for (const item of data) {
        if (abortController?.signal.aborted) break;
        const chunk = `data: ${JSON.stringify(item)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
        await sleep(delay);
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}
