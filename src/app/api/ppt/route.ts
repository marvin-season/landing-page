import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import {
  FABRIC_PPT_SYSTEM_PROMPT,
  fabricSlidesDocumentSchema,
} from "@/app/admin/ppt/fabric-slide-schema";

export const maxDuration = 30;

const deepseek = createDeepSeek({
  apiKey: process.env.NEXT_DEEPSEEK_API_KEY,
  baseURL: process.env.NEXT_DEEPSEEK_BASE_URL,
});

type RequestBody = {
  topic?: string;
  slideCount?: number;
  tone?: "科普" | "商务" | "学术" | "儿童" | "极简";
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const topic = body.topic?.trim();

  if (!topic) {
    return Response.json({ error: "topic is required" }, { status: 400 });
  }

  const slideCount = Math.min(10, Math.max(1, body.slideCount ?? 2));
  const tone = body.tone ?? "科普";

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: fabricSlidesDocumentSchema,
    system: FABRIC_PPT_SYSTEM_PROMPT,
    prompt: [
      `请生成一个 ${slideCount} 页的 PPT，主题：${topic}。`,
      `风格：${tone}。`,
      "要求：每页必须包含顶部标题区（建议用 Rect + IText），并确保版式不重叠、留白合理。",
      "只输出 JSON。",
    ].join("\n"),
  });

  return Response.json(result.object);
}
