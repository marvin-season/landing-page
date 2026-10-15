import Dexie from "dexie";
import { type CompanionMood, maxAlbumBytes } from "./companion-album";

export type StoredCompanion = {
  id: CompanionMood;
  image: Blob;
  still: Blob;
  width: number;
  height: number;
};

// Separate from the ledger: importing or clearing artwork never touches records.
const db = new Dexie("luji-companions");
db.version(1).stores({ images: "id" });
export const companionImages = db.table<StoredCompanion, CompanionMood>(
  "images",
);

export async function replaceCompanionAlbum(images: StoredCompanion[]) {
  requireExportableSize(images);
  await db.transaction("rw", companionImages, async () => {
    await companionImages.clear();
    await companionImages.bulkPut(images);
  });
}

function requireExportableSize(images: StoredCompanion[]) {
  // Leave room for JSON keys/MIME headers so every saved album remains exportable.
  const encodedSize = images.reduce(
    (size, row) =>
      size +
      Math.ceil(row.image.size / 3) * 4 +
      Math.ceil(row.still.size / 3) * 4,
    0,
  );
  if (encodedSize > maxAlbumBytes - 4096) throw new Error("album-size");
}

export async function saveCompanion(image: StoredCompanion) {
  await db.transaction("rw", companionImages, async () => {
    const current = await companionImages.toArray();
    requireExportableSize([
      ...current.filter((row) => row.id !== image.id),
      image,
    ]);
    await companionImages.put(image);
  });
}
