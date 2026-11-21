import { isDevelopment } from "@landing-page/utils";
import {
  novelTxtRelativePath,
  saveNovelTxt,
} from "@/lib/group-chat/save-novel-txt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDevelopment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    text?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title : "";
  const text = typeof body?.text === "string" ? body.text : "";
  await saveNovelTxt(title, text);
  return Response.json({ path: novelTxtRelativePath(title) });
}
