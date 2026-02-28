import { type NextRequest, NextResponse } from "next/server";
import { AGENT_ID, RESOURCE_ID } from "@/lib/service/helper/contsant";
import { mastra } from "@/mastra";

function str(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim();
}

async function memory() {
  const m = await mastra.getAgentById(AGENT_ID).getMemory();
  return m!;
}

export async function GET(_req: NextRequest) {
  try {
    const m = await memory();

    const { threads } = await m.listThreads({ perPage: false });
    const list = threads.map((t) => ({
      id: t.id,
      resourceId: t.resourceId,
      title: t.title,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    return NextResponse.json({ threads: list });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "List failed" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const m = await memory();
    const threadId = crypto.randomUUID();
    const title = `会话`;
    const created = await m.createThread({
      resourceId: RESOURCE_ID,
      threadId,
      title,
    });
    return NextResponse.json({ thread: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const threadId = str(body.threadId);
  const title = str(body.title);
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  try {
    const m = await memory();
    if (typeof m.getThreadById !== "function") {
      return NextResponse.json(
        { error: "getThreadById not supported" },
        { status: 501 },
      );
    }

    return NextResponse.json({ thread: { id: threadId, title } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const threadId = str(body.threadId);
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  try {
    const m = await memory();
    await m.deleteThread(threadId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
