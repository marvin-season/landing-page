import type { Metadata } from "next";
import { exampleWorld } from "@/lib/group-chat/world-templates";
import { WorldLobby } from "../../_components/world-lobby";

export const metadata: Metadata = {
  title: "我的作品 · 开放世界",
  robots: { index: false, follow: false },
};

export default function WorldWorksPage() {
  return <WorldLobby defaultConfig={exampleWorld} />;
}
