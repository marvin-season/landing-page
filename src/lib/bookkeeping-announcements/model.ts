import { z } from "zod";

export const ANNOUNCEMENT_PAGE_SIZE = 10;
const timestamp = z.iso
  .datetime()
  .transform((value) => new Date(value).toISOString());
export const announcementInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(20000),
  publishedAt: timestamp,
  published: z.boolean(),
  pinned: z.boolean().default(false),
});
export const databaseIdSchema = z.string().regex(/^db:[0-9a-f-]{36}$/);
export const announcementSchema = announcementInputSchema.extend({
  id: z.string(),
  source: z.enum(["database", "builtin"]),
});
export type Announcement = z.infer<typeof announcementSchema>;
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

const cursorSchema = z.object({
  asOf: timestamp,
  pinned: z.boolean().default(false),
  publishedAt: timestamp,
  id: z.string().min(1).max(100),
});
export type AnnouncementCursor = z.infer<typeof cursorSchema>;
export const listInputSchema = z.object({
  cursor: z
    .string()
    .max(512)
    .nullable()
    .optional()
    .transform((value) => {
      if (!value) return null;
      return cursorSchema.parse(JSON.parse(value));
    }),
  q: z.string().trim().max(100).default(""),
  locale: z.enum(["zh", "en", "ja"]).default("zh"),
});
export const announcementPageSchema = z.object({
  items: z.array(announcementSchema),
  nextCursor: z.string().nullable(),
});
export type AnnouncementPage = z.infer<typeof announcementPageSchema>;

type AnnouncementPosition = Pick<Announcement, "pinned" | "publishedAt" | "id">;

export function compareAnnouncements(
  a: AnnouncementPosition,
  b: AnnouncementPosition,
) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.publishedAt !== b.publishedAt)
    return a.publishedAt > b.publishedAt ? -1 : 1;
  return a.id === b.id ? 0 : a.id > b.id ? -1 : 1;
}

export function paginateAnnouncements(
  items: Announcement[],
  cursor: AnnouncementCursor | null,
  asOf: string,
): AnnouncementPage {
  const sorted = items
    .filter((item) => !cursor || compareAnnouncements(item, cursor) > 0)
    .sort(compareAnnouncements);
  const page = sorted.slice(0, ANNOUNCEMENT_PAGE_SIZE);
  const last = page.at(-1);
  return {
    items: page,
    nextCursor:
      sorted.length > ANNOUNCEMENT_PAGE_SIZE && last
        ? JSON.stringify({
            asOf,
            pinned: last.pinned,
            publishedAt: last.publishedAt,
            id: last.id,
          })
        : null,
  };
}
