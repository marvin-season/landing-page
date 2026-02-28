import { type NextRequest, NextResponse } from "next/server";
import { AgentConstant } from "@/lib/constant/agent";
import { mastra } from "@/mastra";

const AGENT_ID = AgentConstant.GENERAL_AGENT;


function str(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim();
}

async function memory() {
  const m = await mastra.getAgentById(AGENT_ID).getMemory()
  return m!;
}

export async function GET(_req: NextRequest) {
  try {
    const m = await memory();

    const res = await m.listThreads({ perPage: false });
    const threads = Array.isArray(res?.threads) ? res.threads : [];
    const list = threads.map((t: Record<string, unknown>) => {
      const toStr = (v: unknown) =>
        v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null;
      const id = typeof t.id === "string" ? t.id : "";
      return {
        id,
        resourceId: typeof t.resourceId === "string" ? t.resourceId : id,
        title: typeof t.title === "string" ? t.title : null,
        createdAt: toStr(t.createdAt),
        updatedAt: toStr(t.updatedAt),
      };
    });
    return NextResponse.json({ threads: list });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "List failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const resourceId = str(body.resourceId);
  if (!resourceId) {
    return NextResponse.json({ error: "resourceId required" }, { status: 400 });
  }
  const threadId = str(body.threadId) ?? resourceId;
  const title = str(body.title) ?? undefined;

  try {
    const m = await memory();
    if (typeof m.createThread !== "function") {
      return NextResponse.json(
        { error: "createThread not supported" },
        { status: 501 },
      );
    }
    const created = await m.createThread({ resourceId, threadId, title });
    const t = created as { id?: string; resourceId?: string };
    const id = t.id ?? t.resourceId ?? resourceId;
    const rid = t.resourceId ?? id;
    return NextResponse.json(
      { thread: { id, resourceId: rid, title: title ?? null } },
      { status: 201 },
    );
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
    if (typeof m.getThreadById !== "function") {
      return NextResponse.json(
        { error: "getThreadById not supported" },
        { status: 501 },
      );
    }

    await m.deleteThread(threadId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
