import type { Metadata } from "next";
import { WorldRoomView } from "../_components/world-room";

export const metadata: Metadata = {
  title: "世界群聊",
  robots: { index: false, follow: false },
};
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <WorldRoomView key={roomId} roomId={roomId} />;
}
