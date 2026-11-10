import { auth } from "@/auth";
import { createWorldHandlers } from "@/lib/group-chat/http";
import { completeText, listModels } from "@/lib/group-chat/provider";
import { worldStore } from "@/lib/group-chat/store";

export const runtime = "nodejs";
const handle = createWorldHandlers({
  store: worldStore,
  complete: completeText,
  models: listModels,
  getUser: async () => (await auth())?.user?.id ?? null,
});
async function route(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handle(request, (await context.params).path ?? []);
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
