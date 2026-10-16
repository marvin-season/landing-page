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
      // Serialize schema inspection and migration so concurrent cold starts are safe.
      pending = (async () => {
        const transaction = await client.transaction("write");
        try {
          await transaction.execute(`CREATE TABLE IF NOT EXISTS bookkeeping_announcements (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            published_at TEXT NOT NULL,
            published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
            pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL
          )`);
          const columns = await transaction.execute(
            "PRAGMA table_info(bookkeeping_announcements)",
          );
          if (!columns.rows.some((column) => column.name === "pinned")) {
            await transaction.execute(
              "ALTER TABLE bookkeeping_announcements ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))",
            );
          }
          await transaction.execute(
            "CREATE INDEX IF NOT EXISTS bookkeeping_announcements_public_pinned ON bookkeeping_announcements (published, pinned DESC, published_at DESC, id DESC)",
          );
          await transaction.execute(
            "CREATE INDEX IF NOT EXISTS bookkeeping_announcements_timeline_pinned ON bookkeeping_announcements (pinned DESC, published_at DESC, id DESC)",
          );
          await transaction.commit();
        } finally {
          transaction.close();
        }
      })().catch((error) => {
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
      pinned: Number(row.pinned) === 1,
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
        where.push(
          "(pinned < ? OR (pinned = ? AND (published_at < ? OR (published_at = ? AND id < ?))))",
        );
        args.push(
          Number(cursor.pinned),
          Number(cursor.pinned),
          cursor.publishedAt,
          cursor.publishedAt,
          cursor.id,
        );
      }
      if (q) {
        where.push("(title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')");
        const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
        args.push(pattern, pattern);
      }
      args.push(ANNOUNCEMENT_PAGE_SIZE + 1);
      const result = await client.execute({
        sql: `SELECT id, title, body, published_at, published, pinned FROM bookkeeping_announcements WHERE ${where.join(" AND ")} ORDER BY pinned DESC, published_at DESC, id DESC LIMIT ?`,
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
        Number(value.pinned),
        now,
        userId,
      ];
      if (id) {
        const result = await client.execute({
          sql: "UPDATE bookkeeping_announcements SET title = ?, body = ?, published_at = ?, published = ?, pinned = ?, updated_at = ?, updated_by = ? WHERE id = ?",
          args: [...args, id],
        });
        if (!result.rowsAffected) throw new AnnouncementNotFound();
      } else {
        await client.execute({
          sql: "INSERT INTO bookkeeping_announcements (title, body, published_at, published, pinned, updated_at, updated_by, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
