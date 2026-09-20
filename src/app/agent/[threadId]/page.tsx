import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { apiCaller } from "~/server";
import { AgentThreadContent } from "./_components/agent-thread-content";

type AgentThreadPageProps = {
  params: Promise<{
    threadId?: string;
  }>;
};

const getThreadDetail = cache(async (threadId: string) => {
  return apiCaller.thread.detail({ threadId });
});

export async function generateMetadata({
  params,
}: AgentThreadPageProps): Promise<Metadata> {
  const { threadId } = await params;
  if (!threadId) {
    return { title: "Agent" };
  }

  try {
    const { thread } = await getThreadDetail(threadId);
    return { title: thread.title?.trim() || "Agent" };
  } catch {
    return { title: "Agent" };
  }
}

export default async function AgentThreadPage({
  params,
}: AgentThreadPageProps) {
  const { threadId } = await params;

  if (!threadId) {
    notFound();
  }

  try {
    await getThreadDetail(threadId);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return <AgentThreadContent threadId={threadId} />;
}
