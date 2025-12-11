import { createDeepSeek } from '@ai-sdk/deepseek';
import { convertToModelMessages, streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const deepseek = createDeepSeek({
  apiKey: process.env.NEXT_DEEPSEEK_API_KEY,
  baseURL: process.env.NEXT_DEEPSEEK_BASE_URL,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
