import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import { apiCaller } from "~/server";
import { AgentThreadContent } from "./_components/agent-thread-content";

type AgentThreadPageProps = {
  params: Promise<{
    threadId?: string;
  }>;
};

export default async function AgentThreadPage({
  params,
}: AgentThreadPageProps) {
  const { threadId } = await params;

  if (!threadId) {
    notFound();
  }

  try {
    await apiCaller.thread.detail({ threadId });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return <AgentThreadContent threadId={threadId} />;
}
