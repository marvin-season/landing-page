"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, CheckCircle2, Pencil, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { summarizeCalories } from "@/lib/bbq/calories";
import { formatYuan } from "@/lib/bbq/money";
import { getLineTags } from "@/lib/bbq/tags";
import type { Order, OrderPhoto } from "@/lib/bbq/types";
import { formatCalories } from "../../_lib/bbq-i18n";
import { bbqOrderPath } from "../../_lib/bbq-paths";
import { ItemTagBadge } from "../menu/item-tags";
import { BbqLink as Link } from "../shared/bbq-link";

export function OrderDetail({
  order,
  updatingStatusId,
  onToggleStatus,
}: {
  order: Order;
  updatingStatusId: string | null;
  onToggleStatus: (order: Order) => Promise<void>;
}) {
  const { i18n, t } = useLingui();
  const [previewPhoto, setPreviewPhoto] = useState<OrderPhoto | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="flex min-h-0 flex-col flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 p-3 overflow-y-auto overscroll-y-contain">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">
              <Trans>记录明细</Trans>
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              <Trans>
                热量 {formatCalories(i18n, summarizeCalories(order.lines))}
              </Trans>
            </span>
          </div>
          <ul className="mt-2 divide-y text-sm">
            {order.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-foreground font-medium">
                    {line.name}
                  </p>
                  {getLineTags(line).map((tag) => (
                    <ItemTagBadge key={tag.id} tag={tag} />
                  ))}
                  <p className="mt-0.5 tabular-nums text-muted-foreground text-xs">
                    {formatYuan(line.priceCents)} × {line.quantity}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    <Trans>
                      热量 {formatCalories(i18n, summarizeCalories([line]))}
                    </Trans>
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {formatYuan(line.lineCents)}
                </span>
              </li>
            ))}
          </ul>
          {order.photos.length > 0 ? (
            <section className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <Camera className="size-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-foreground">
                    <Trans>留存照片</Trans>
                  </h3>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  <Trans>{order.photos.length} 张</Trans>
                </span>
              </div>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {order.photos.map((photo, index) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      className="relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-85"
                      aria-label={t`查看第 ${index + 1} 张留存照片`}
                      onClick={(event) => {
                        photoTriggerRef.current = event.currentTarget;
                        setPreviewPhoto(photo);
                      }}
                    >
                      <Image
                        src={photo.dataUrl}
                        alt={t`记录留存照片 ${index + 1}`}
                        fill
                        sizes="8rem"
                        unoptimized
                        className="size-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t p-2 bg-muted/30 shrink-0">
          <Button
            type="button"
            className="rounded-lg px-3 shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-foreground/70 focus-visible:ring-offset-0"
            disabled={updatingStatusId !== null}
            onClick={() => void onToggleStatus(order)}
          >
            {order.status === "open" ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <RotateCcw className="size-4" aria-hidden="true" />
            )}
            {updatingStatusId === order.id
              ? t`处理中…`
              : order.status === "open"
                ? t`完成记录`
                : t`恢复进行中`}
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-lg px-3 shadow-none hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0"
          >
            <Link href={bbqOrderPath(order.id)}>
              <Pencil className="size-4" aria-hidden="true" />
              <Trans>修改记录</Trans>
            </Link>
          </Button>
        </div>
      </div>
      <Dialog.Root
        open={previewPhoto !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPhoto(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-110 bg-black/80" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 z-110 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-background p-2 pt-14 shadow-lg focus:outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              photoTriggerRef.current?.focus();
            }}
          >
            <Dialog.Title className="absolute top-4 left-4 text-sm font-medium">
              <Trans>记录留存照片</Trans>
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              <Trans>记录的照片大图，可按 Esc 或关闭按钮返回记录详情</Trans>
            </Dialog.Description>
            {previewPhoto ? (
              <Image
                src={previewPhoto.dataUrl}
                alt={t`记录留存照片大图`}
                width={1600}
                height={1600}
                unoptimized
                className="max-h-[calc(100dvh-7rem)] w-auto max-w-full object-contain"
              />
            ) : null}
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-11"
                aria-label={t`关闭照片预览`}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
