import { isDevelopment } from "@landing-page/utils";
import {
  novelTxtFileName,
  novelTxtRelativePath,
  readNovelTxt,
  saveNovelTxt,
} from "@/lib/group-chat/save-novel-txt";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isDevelopment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const novel = await readNovelTxt(id);
  if (!novel) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(novel);
}

export async function POST(request: Request) {
  if (!isDevelopment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    title?: unknown;
    text?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const title = typeof body?.title === "string" ? body.title : "";
  const text = typeof body?.text === "string" ? body.text : "";
  const saved = await saveNovelTxt(id, title, text);
  return Response.json({
    path: novelTxtRelativePath(id, title),
    fileName: novelTxtFileName(title),
    updatedAt: saved.updatedAt,
  });
}
