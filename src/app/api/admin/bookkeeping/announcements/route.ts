import { auth } from "@/auth";
import { getUserRole } from "@/lib/auth-users/store";
import { createAnnouncementHandlers } from "@/lib/bookkeeping-announcements/http";
import { announcementStore } from "@/lib/bookkeeping-announcements/store";

export const runtime = "nodejs";
const handler = createAnnouncementHandlers({
  store: announcementStore,
  getActor: async () => {
    const session = await auth();
    if (!session?.user?.id) return null;
    return { id: session.user.id, role: await getUserRole(session.user.id) };
  },
}).admin;
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
