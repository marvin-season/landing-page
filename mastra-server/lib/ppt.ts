import type { FabricSlidesDocument } from "@/app/admin/ppt/fabric-slide-schema";
import { fabricSlidesDocumentSchema } from "@/app/admin/ppt/fabric-slide-schema";
import { mastra } from "~/mastra-server";
import { AgentConstant } from "~/mastra-server/constant";

type GeneratePptParams = {
  topic: string;
  slideCount: number;
  tone: "科普" | "商务" | "学术" | "儿童" | "极简";
};

function buildPptPrompt({
  topic,
  slideCount,
  tone,
}: GeneratePptParams): string {
  return [
    `请生成一个 ${slideCount} 页的 PPT，主题：${topic}。`,
    `整体语气风格：${tone}。`,
    "封面页需要有清晰的标题和可选副标题；后续每一页需要有层级清晰的小标题和 2–5 条要点。",
    "请根据不同页的逻辑结构合理规划内容，而不是简单重复相同要点。",
    "只输出 JSON，对应前置系统说明中的 Fabric PPT 画布 JSON 结构。",
  ].join("\n");
}

export async function generatePptSlides(
  params: GeneratePptParams,
): Promise<FabricSlidesDocument> {
  const agent = mastra.getAgent(AgentConstant.PPT_AGENT);

  if (!agent) {
    throw new Error("PPT agent is not configured");
  }

  const prompt = buildPptPrompt(params);

  const stream = await agent.stream(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    {
      structuredOutput: {
        schema: fabricSlidesDocumentSchema,
        jsonPromptInjection: true,
      },
    },
  );

  // 这里使用 structuredOutput 的流式能力，在内部以流的方式构建对象，
  // 对外仍然返回一次性完整的结构化结果，便于 API 与前端保持简单接口。
  const object = await stream.object;

  if (!object) {
    throw new Error("Failed to generate PPT slides");
  }

  return object;
}
