import { generatePptSlides } from "~/mastra-server/lib/ppt";

export const maxDuration = 30;

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

  try {
    const object = await generatePptSlides({ topic, slideCount, tone });
    return Response.json(object);
  } catch (error) {
    console.error("Error generating PPT via Mastra:", error);
    return Response.json(
      { error: "Internal server error while generating PPT" },
      { status: 500 },
    );
  }
}
