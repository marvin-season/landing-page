import type { Metadata } from "next";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { WorldLobby } from "./_components/world-lobby";

export const metadata: Metadata = {
  title: "开放世界",
  robots: { index: false, follow: false },
};
export default async function WorldsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const kind = (await searchParams).kind === "novel" ? "novel" : "script";
  return <WorldLobby key={kind} kind={kind} templates={loadWorldTemplates()} />;
}
