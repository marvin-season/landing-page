import type { Metadata } from "next";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { WorldTemplatesLobby } from "../_components/world-templates-lobby";

export const metadata: Metadata = {
  title: "预设模板",
  robots: { index: false, follow: false },
};

export default function WorldTemplatesPage() {
  return <WorldTemplatesLobby templates={loadWorldTemplates()} />;
}
