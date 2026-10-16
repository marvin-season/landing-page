import { createAnnouncementHandlers } from "@/lib/bookkeeping-announcements/http";
import { announcementStore } from "@/lib/bookkeeping-announcements/store";

export const runtime = "nodejs";
export const GET = createAnnouncementHandlers({
  store: announcementStore,
  getActor: async () => null,
}).publicList;
