import type { Metadata } from "next";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { WorldLobby } from "./_components/world-lobby";

export const metadata: Metadata = {
  title: "World Chat",
  description: "Set up a world and chat with multiple characters.",
  robots: { index: false, follow: false },
};
export default function WorldsPage() {
  return <WorldLobby templates={loadWorldTemplates()} />;
}
