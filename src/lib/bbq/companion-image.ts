import { type CompanionMood, maxCompanionBytes } from "./companion-album";
import type { StoredCompanion } from "./companion-album-store";

async function readImage(blob: Blob): Promise<HTMLImageElement> {
  if (
    !blob.size ||
    blob.size > maxCompanionBytes ||
    !/^image\/(png|jpeg|gif|webp)$/.test(blob.type)
  )
    throw new Error("image-format");
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 16_000_000
    )
      throw new Error("image-dimensions");
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareCompanion(
  id: CompanionMood,
  image: Blob,
  suppliedStill?: Blob,
): Promise<StoredCompanion> {
  const decoded = await readImage(image);
  let still: Blob;
  if (suppliedStill) {
    // A reduced-motion source must itself be static.
    if (!/^image\/(png|jpeg)$/.test(suppliedStill.type))
      throw new Error("still-format");
    await readImage(suppliedStill);
    still = suppliedStill;
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = decoded.naturalWidth;
    canvas.height = decoded.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image-canvas");
    context.drawImage(decoded, 0, 0);
    still = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("image-canvas"))),
        "image/png",
      );
    });
    if (still.size > maxCompanionBytes) throw new Error("image-size");
  }
  // Keep the supplied animation bytes unchanged; only its still is generated.
  return {
    id,
    image,
    still,
    width: decoded.naturalWidth,
    height: decoded.naturalHeight,
  };
}
