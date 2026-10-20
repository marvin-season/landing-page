import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { Camera, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { MAX_ORDER_PHOTOS } from "@/lib/bbq/order-photo";
import type { OrderPhoto } from "@/lib/bbq/types";
import { cls } from "../../_styles/bbq-layout";
import { editorSectionCls } from "../../_styles/order-editor-styles";

const photoActionCls = cls`
  inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-muted/30
  px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/70
  has-disabled:pointer-events-none has-disabled:opacity-50 has-focus-visible:ring-1
  has-focus-visible:ring-inset has-focus-visible:ring-primary/50 h-11 min-w-0 text-center
  border border-border/60 relative
`;

export function OrderPhotos({
  photos,
  processingPhotos,
  addPhotos,
  removePhoto,
}: {
  photos: OrderPhoto[];
  processingPhotos: boolean;
  addPhotos: (files: FileList | null) => Promise<void>;
  removePhoto: (id: string) => void;
}) {
  const { t } = useLingui();
  return (
    <section className={editorSectionCls}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Camera
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <Trans>附张照片</Trans>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            <Trans>小票或随手拍，最多 {MAX_ORDER_PHOTOS} 张</Trans>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs tabular-nums text-muted-foreground">
            {photos.length}/{MAX_ORDER_PHOTOS}
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className={photoActionCls}>
          <Camera className="size-4" aria-hidden="true" />
          {processingPhotos ? t`处理照片中…` : t`拍照`}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={processingPhotos || photos.length >= MAX_ORDER_PHOTOS}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            onChange={(event) => {
              const input = event.currentTarget;
              void addPhotos(input.files).finally(() => {
                input.value = "";
              });
            }}
          />
        </label>
        <label className={photoActionCls}>
          <ImagePlus className="size-4" aria-hidden="true" />
          {processingPhotos ? t`处理照片中…` : t`从相册选择`}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={processingPhotos || photos.length >= MAX_ORDER_PHOTOS}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            onChange={(event) => {
              const input = event.currentTarget;
              void addPhotos(input.files).finally(() => {
                input.value = "";
              });
            }}
          />
        </label>
      </div>
      {photos.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={photo.dataUrl}
                alt={t`记录留存照片 ${index + 1}`}
                fill
                sizes="(max-width: 767px) 25vw, 7rem"
                unoptimized
                className="size-full object-cover"
              />
              <Button
                type="button"
                variant="soft"
                size="icon"
                className="absolute top-1 right-1 shadow-sm size-11"
                aria-label={t`删除第 ${index + 1} 张照片`}
                onClick={() => removePhoto(photo.id)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
