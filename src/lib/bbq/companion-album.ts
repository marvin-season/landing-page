import { z } from "zod";

export const companionMoods = [
  "hello",
  "dance",
  "chef",
  "exercise",
  "shy",
  "tumble",
  "wave",
  "workout",
  "busy",
  "ponder",
  "happy",
  "care",
  "photo-pose",
] as const;
export type CompanionMood = (typeof companionMoods)[number];
export const maxCompanionBytes = 12 * 1024 * 1024;
export const maxAlbumBytes = 100 * 1024 * 1024;
const imageData = z
  .string()
  .max(Math.ceil(maxCompanionBytes / 3) * 4 + 64)
  .regex(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/);
const albumSchema = z
  .object({
    format: z.literal("luji-companions"),
    version: z.literal(1),
    images: z.partialRecord(
      z.enum(companionMoods),
      z
        .object({
          src: imageData,
          still: imageData.optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type CompanionAlbum = z.infer<typeof albumSchema>;

export function parseCompanionAlbum(text: string): CompanionAlbum {
  if (new TextEncoder().encode(text).length > maxAlbumBytes)
    throw new Error("album-size");
  const album = albumSchema.parse(JSON.parse(text));
  if (!Object.keys(album.images).length) throw new Error("album-empty");
  return album;
}

export function imageBlob(data: string): Blob {
  const [header, encoded] = data.split(",");
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: header.slice(5, -7) });
}

export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
