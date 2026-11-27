import type { ReactNode } from "react";
import { WorldLobbyChrome } from "../_components/world-lobby-chrome";

export default function WorldLobbyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorldLobbyChrome>{children}</WorldLobbyChrome>;
}
