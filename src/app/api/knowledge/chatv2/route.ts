export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.text !== "string" || !body.text.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  const characters = Array.from(`hello,i am your assiastant,${body.text}`);
  const encoder = new TextEncoder();
  let offset = 0;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (request.signal.aborted) {
        controller.close();
        return;
      }
      if (offset >= characters.length) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      const delta = characters.slice(offset, offset + 3).join("");
      offset += 3;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
      );
      await new Promise((resolve) => setTimeout(resolve, 40));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
