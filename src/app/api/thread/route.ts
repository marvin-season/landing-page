import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { type NextRequest, NextResponse } from "next/server";
import { AgentConstant } from "@/lib/constant/agent";
import { mastra } from "@/mastra";

function resolveAgentId(value: unknown): string {
  if (typeof value === "string" && value.length > 0) return value;
  return AgentConstant.GENERAL_AGENT;
}

function resolveNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function resolveMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function resolvePerPage(value: string | null): number | false | undefined {
  if (value == null || value === "") return undefined;
  if (value === "false") return false;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return undefined;
}

function normalizeThread(thread: unknown) {
  if (!thread || typeof thread !== "object") return null;
  const t = thread as Record<string, unknown>;
  const id = resolveNonEmptyString(t.id);
  if (!id) return null;
  const resourceId = resolveNonEmptyString(t.resourceId) ?? id;
  return {
    id,
    title: resolveNonEmptyString(t.title),
    resourceId,
    metadata: t.metadata ?? null,
    createdAt: t.createdAt ?? null,
    updatedAt: t.updatedAt ?? null,
  };
}

async function getMemory(agentId: string) {
  return mastra.getAgentById(agentId).getMemory();
}

async function getThread(memory: unknown, threadId: string) {
  const m = memory as {
    getThreadById?: (params: { threadId: string }) => Promise<unknown>;
  };
  if (typeof m.getThreadById !== "function") return null;
  return m.getThreadById({ threadId });
}

async function recallThreadMessages(params: {
  memory: unknown;
  threadId: string;
  resourceId?: string | null;
}) {
  const m = params.memory as {
    recall?: (input: {
      threadId: string;
      resourceId?: string;
      perPage?: number | false;
    }) => Promise<{ messages?: unknown[] } | null>;
  };
  if (typeof m.recall !== "function") return [];

  const response = await m.recall({
    threadId: params.threadId,
    ...(params.resourceId ? { resourceId: params.resourceId } : {}),
    perPage: false,
  });

  return toAISdkV5Messages(
    (response?.messages ?? []) as Parameters<typeof toAISdkV5Messages>[0],
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const agentId = resolveAgentId(body.agentId);
  const resourceId = resolveNonEmptyString(body.resourceId);
  const threadId = resolveNonEmptyString(body.threadId);
  const title = resolveNonEmptyString(body.title) ?? undefined;
  const metadata = resolveMetadata(body.metadata);

  if (!resourceId) {
    return NextResponse.json(
      { error: "resourceId is required in request body" },
      { status: 400 },
    );
  }

  try {
    const memory = await getMemory(agentId);
    const creator = memory as {
      createThread?: (params: {
        resourceId: string;
        threadId?: string;
        title?: string;
        metadata?: Record<string, unknown>;
      }) => Promise<unknown>;
    };
    if (typeof creator.createThread !== "function") {
      return NextResponse.json(
        { error: "Thread create is not supported by current memory adapter" },
        { status: 501 },
      );
    }

    const created = await creator.createThread({
      resourceId,
      ...(threadId ? { threadId } : {}),
      ...(title ? { title } : {}),
      ...(metadata ? { metadata } : {}),
    });
    const normalized = normalizeThread(created);
    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid thread payload returned by memory adapter" },
        { status: 500 },
      );
    }

    return NextResponse.json({ thread: normalized }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create thread" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const agentId = resolveAgentId(req.nextUrl.searchParams.get("agentId"));
  const threadId = resolveNonEmptyString(req.nextUrl.searchParams.get("threadId"));
  const resourceId = resolveNonEmptyString(
    req.nextUrl.searchParams.get("resourceId"),
  );
  const pageRaw = req.nextUrl.searchParams.get("page");
  const perPage = resolvePerPage(req.nextUrl.searchParams.get("perPage"));
  const page =
    pageRaw != null && pageRaw !== "" && Number.isInteger(Number(pageRaw))
      ? Number(pageRaw)
      : undefined;

  try {
    const memory = await getMemory(agentId);

    if (threadId) {
      const thread = await getThread(memory, threadId);
      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      const detail =
        typeof (thread as { get?: () => Promise<unknown> }).get === "function"
          ? await (thread as { get: () => Promise<unknown> }).get()
          : thread;

      const detailObj = (detail ?? {}) as Record<string, unknown>;
      const messages = await recallThreadMessages({
        memory,
        threadId,
        resourceId: resourceId ?? resolveNonEmptyString(detailObj.resourceId),
      });

      return NextResponse.json({
        thread: normalizeThread(detail),
        messages,
      });
    }

    const lister = memory as {
      listThreads?: (params: {
        filter?: { resourceId?: string; metadata?: Record<string, unknown> };
        page?: number;
        perPage?: number | false;
      }) => Promise<unknown>;
    };
    if (typeof lister.listThreads !== "function") {
      return NextResponse.json(
        { error: "Thread list is not supported by current memory adapter" },
        { status: 501 },
      );
    }

    const list = await lister.listThreads({
      ...(resourceId ? { filter: { resourceId } } : {}),
      ...(typeof page === "number" ? { page } : {}),
      ...(perPage !== undefined ? { perPage } : {}),
    });

    return NextResponse.json(list ?? { threads: [], total: 0, page: 0, hasMore: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list threads" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const agentId = resolveAgentId(body.agentId);
  const threadId = resolveNonEmptyString(body.threadId);
  const title = resolveNonEmptyString(body.title) ?? undefined;
  const resourceId = resolveNonEmptyString(body.resourceId) ?? undefined;
  const metadata = resolveMetadata(body.metadata);

  if (!threadId) {
    return NextResponse.json(
      { error: "threadId is required in request body" },
      { status: 400 },
    );
  }
  if (!title && !metadata && !resourceId) {
    return NextResponse.json(
      { error: "At least one of title, metadata, resourceId is required" },
      { status: 400 },
    );
  }

  try {
    const memory = await getMemory(agentId);
    const thread = await getThread(memory, threadId);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const updater = thread as {
      update?: (params: {
        title?: string;
        metadata?: Record<string, unknown>;
        resourceId?: string;
      }) => Promise<unknown>;
    };
    if (typeof updater.update !== "function") {
      return NextResponse.json(
        { error: "Thread update is not supported by current memory adapter" },
        { status: 501 },
      );
    }

    const updated = await updater.update({
      ...(title ? { title } : {}),
      ...(metadata ? { metadata } : {}),
      ...(resourceId ? { resourceId } : {}),
    });

    return NextResponse.json({ thread: normalizeThread(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update thread" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const agentId = resolveAgentId(body.agentId);
  const threadId = resolveNonEmptyString(body.threadId);

  if (!threadId) {
    return NextResponse.json(
      { error: "threadId is required in request body" },
      { status: 400 },
    );
  }

  try {
    const memory = await getMemory(agentId);
    const thread = await getThread(memory, threadId);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const deleter = thread as { delete?: () => Promise<unknown> };
    if (typeof deleter.delete !== "function") {
      return NextResponse.json(
        { error: "Thread delete is not supported by current memory adapter" },
        { status: 501 },
      );
    }

    await deleter.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete thread" },
      { status: 500 },
    );
  }
}
