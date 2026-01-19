import type { z } from 'zod';

export const textDecoder = new TextDecoder();
export const textEncoder = new TextEncoder();
/**
 * Generate a stream of messages from a SSE readable stream
 * @param stream - The readable stream to generate messages from
 * @returns A generator of messages
 */
export async function* SSEMessageGenerator(stream: ReadableStream<Uint8Array<ArrayBuffer> | string> | null) {
  if (!stream) {
    return;
  }
  let rest_str = '';
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // 处理流结束时的剩余数据
        if (rest_str.trim()) {
          try {
            yield rest_str;
          } catch (e) {
            console.warn('Failed to parse remaining data:', e);
          }
        }
        break;
      }

      const sse_chunk = typeof value === 'string' ? value : textDecoder.decode(value);
      for (const line of sse_chunk.split(/\n+/)) {
        const json_str = line.replace(/data:\s*/, '').trim();
        if (json_str.length > 0) {
          try {
            const full_str = rest_str + json_str;
            rest_str = '';
            yield full_str; // 在生成器内yield消息
          } catch (e) {
            rest_str += json_str;
            console.warn(e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function MessageParser<T extends z.ZodSchema>(message: string, schema: T): z.infer<T> | null {
  try {
    const json = JSON.parse(message);
    const result = schema.safeParse(json);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  } catch (_e) {
    return null;
  }
}
