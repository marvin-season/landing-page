import type { Client, InValue, Row } from "@libsql/client";
import { getAuthDb } from "@/lib/auth-users/store";
import { getBuiltinAnnouncements } from "./builtin";
import {
  ANNOUNCEMENT_PAGE_SIZE,
  type Announcement,
  type AnnouncementCursor,
  announcementInputSchema,
  databaseIdSchema,
  paginateAnnouncements,
} from "./model";

export class AnnouncementNotFound extends Error {}

export function createAnnouncementStore(getClient: () => Client = getAuthDb) {
  const ready = new WeakMap<Client, Promise<unknown>>();
  async function database() {
    const client = getClient();
    let pending = ready.get(client);
    if (!pending) {
      pending = client
        .batch(
          [
            `CREATE TABLE IF NOT EXISTS bookkeeping_announcements (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          published_at TEXT NOT NULL,
          published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          updated_by TEXT NOT NULL
        )`,
            "CREATE INDEX IF NOT EXISTS bookkeeping_announcements_public ON bookkeeping_announcements (published, published_at DESC, id DESC)",
            "CREATE INDEX IF NOT EXISTS bookkeeping_announcements_timeline ON bookkeeping_announcements (published_at DESC, id DESC)",
          ],
          "write",
        )
        .catch((error) => {
          ready.delete(client);
          throw error;
        });
      ready.set(client, pending);
    }
    await pending;
    return client;
  }
  function fromRow(row: Row): Announcement {
    return {
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      publishedAt: String(row.published_at),
      published: Number(row.published) === 1,
      source: "database",
    };
  }
  return {
    async list({
      cursor,
      q,
      locale,
      admin = false,
      now = new Date().toISOString(),
    }: {
      cursor: AnnouncementCursor | null;
      q: string;
      locale: string;
      admin?: boolean;
      now?: string;
    }) {
      const client = await database();
      // Never let a forged cursor reveal scheduled announcements.
      const asOf = cursor && cursor.asOf < now ? cursor.asOf : now;
      const where = ["created_at <= ?"];
      const args: InValue[] = [asOf];
      if (!admin) {
        where.push("published = 1 AND published_at <= ?");
        args.push(asOf);
      }
      if (cursor) {
        where.push("(published_at < ? OR (published_at = ? AND id < ?))");
        args.push(cursor.publishedAt, cursor.publishedAt, cursor.id);
      }
      if (q) {
        where.push("(title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')");
        const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
        args.push(pattern, pattern);
      }
      args.push(ANNOUNCEMENT_PAGE_SIZE + 1);
      const result = await client.execute({
        sql: `SELECT id, title, body, published_at, published FROM bookkeeping_announcements WHERE ${where.join(" AND ")} ORDER BY published_at DESC, id DESC LIMIT ?`,
        args,
      });
      const builtin = admin
        ? []
        : getBuiltinAnnouncements(locale).filter(
            (item) =>
              item.publishedAt <= asOf &&
              `${item.title}\n${item.body}`
                .toLocaleLowerCase()
                .includes(q.toLocaleLowerCase()),
          );
      return paginateAnnouncements(
        [...result.rows.map(fromRow), ...builtin],
        cursor,
        asOf,
      );
    },
    async save(input: unknown, userId: string, id?: string) {
      const value = announcementInputSchema.parse(input);
      if (id) databaseIdSchema.parse(id);
      const client = await database();
      const now = new Date().toISOString();
      const recordId = id ?? `db:${crypto.randomUUID()}`;
      const args: InValue[] = [
        value.title,
        value.body,
        value.publishedAt,
        Number(value.published),
        now,
        userId,
      ];
      if (id) {
        const result = await client.execute({
          sql: "UPDATE bookkeeping_announcements SET title = ?, body = ?, published_at = ?, published = ?, updated_at = ?, updated_by = ? WHERE id = ?",
          args: [...args, id],
        });
        if (!result.rowsAffected) throw new AnnouncementNotFound();
      } else {
        await client.execute({
          sql: "INSERT INTO bookkeeping_announcements (title, body, published_at, published, updated_at, updated_by, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [...args, recordId, now],
        });
      }
      return { ...value, id: recordId, source: "database" as const };
    },
    async remove(id: string) {
      databaseIdSchema.parse(id);
      const client = await database();
      const result = await client.execute({
        sql: "DELETE FROM bookkeeping_announcements WHERE id = ?",
        args: [id],
      });
      if (!result.rowsAffected) throw new AnnouncementNotFound();
    },
  };
}
export const announcementStore = createAnnouncementStore();
