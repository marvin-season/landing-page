import { z } from "zod";
import {
  announcementInputSchema,
  databaseIdSchema,
  listInputSchema,
} from "./model";
import { AnnouncementNotFound, type createAnnouncementStore } from "./store";

type Actor = { id: string; role: string | null } | null;
export function createAnnouncementHandlers({
  store,
  getActor,
}: {
  store: ReturnType<typeof createAnnouncementStore>;
  getActor: () => Promise<Actor>;
}) {
  const json = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  async function handle(request: Request, admin: boolean) {
    try {
      let actor: Actor = null;
      if (admin) {
        actor = await getActor();
        if (!actor) return json({ error: "unauthorized" }, 401);
        if (actor.role !== "admin" && actor.role !== "super_admin")
          return json({ error: "forbidden" }, 403);
      }
      if (request.method === "GET") {
        const params = Object.fromEntries(new URL(request.url).searchParams);
        const input = listInputSchema.parse(params);
        return json(await store.list({ ...input, admin }));
      }
      if (!admin || !actor) return json({ error: "method_not_allowed" }, 405);
      // Cookie authentication also needs CSRF protection on writes.
      if (request.headers.get("origin") !== new URL(request.url).origin)
        return json({ error: "forbidden" }, 403);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "invalid_input" }, 400);
      const body: unknown = await request.json();
      if (request.method === "POST")
        return json(
          await store.save(announcementInputSchema.parse(body), actor.id),
          201,
        );
      if (request.method === "PATCH") {
        const input = announcementInputSchema
          .extend({ id: databaseIdSchema })
          .parse(body);
        return json(await store.save(input, actor.id, input.id));
      }
      if (request.method === "DELETE") {
        const { id } = z.object({ id: databaseIdSchema }).parse(body);
        await store.remove(id);
        return json({ success: true });
      }
      return json({ error: "method_not_allowed" }, 405);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return json({ error: "invalid_input" }, 400);
      if (error instanceof AnnouncementNotFound)
        return json({ error: "not_found" }, 404);
      return json({ error: "unavailable" }, 503);
    }
  }
  return {
    publicList: (request: Request) => handle(request, false),
    admin: (request: Request) => handle(request, true),
  };
}
