import type { Metadata } from "next";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { WorldLobby } from "./_components/world-lobby";

export const metadata: Metadata = {
  title: "世界群聊",
  description: "设定一个世界，与多个角色一起展开故事。",
  robots: { index: false, follow: false },
};
export default function WorldsPage() {
  return <WorldLobby templates={loadWorldTemplates()} />;
}
