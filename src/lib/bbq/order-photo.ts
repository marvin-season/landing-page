import type { OrderPhoto } from "./types";

export const MAX_ORDER_PHOTOS = 8;

const MAX_PHOTO_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid_image"));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("image_encode_failed"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("image_read_failed"));
    };
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.readAsDataURL(blob);
  });
}

export async function createOrderPhoto(file: File): Promise<OrderPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("invalid_image");

  const image = await loadImage(file);
  const scale = Math.min(
    1,
    MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("image_encode_failed");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    id: crypto.randomUUID(),
    dataUrl: await blobDataUrl(await canvasBlob(canvas)),
    createdAt: new Date().toISOString(),
  };
}
