"use client";

import {
  Alert,
  AlertDescription,
  Collapsible,
  CollapsibleBackdrop,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleDescription,
  CollapsibleTitle,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import type { ItemTag } from "@/lib/bbq/types";
import { useMenuData } from "../../_hooks/use-menu-data";
import { Companion } from "../companion/companion";
import { BookkeepingTitle } from "../shared/bookkeeping-layout";
import { ItemEditViewport } from "../shared/item-edit-viewport";
import { DishHint, MenuSurface } from "./dish-form";
import { DishList } from "./dish-list";
import { DishRow } from "./dish-row";
import { MenuLoadStatus } from "./menu-load-status";

export function MenuEditor({
  variant = "page",
  sharedTags,
  onTagsChanged,
  open,
  onOpenChange,
}: {
  variant?: "page" | "inline";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sharedTags?: ItemTag[];
  onTagsChanged?: (tags: ItemTag[]) => void;
}) {
  const {
    menu,
    tags,
    dishes,
    phase,
    message,
    notice,
    listRequested,
    setMessage,
    setLoadRequest,
    setListRequested,
    reloadTags,
    handleSaved,
  } = useMenuData(onTagsChanged);
  const [localOpen, setLocalOpen] = useState(false);
  const listHeaderRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const adding = open ?? localOpen;
  function changeAdding(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
    if (next) {
      setLoadRequest((request) => request || 1);
    }
  }

  if (variant === "inline") {
    return (
      <MenuSurface asChild>
        <Collapsible
          open={adding}
          onOpenChange={changeAdding}
          className="static shrink-0"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.defaultPrevented && adding) {
              event.preventDefault();
              event.stopPropagation();
              changeAdding(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <CollapsibleTrigger ref={triggerRef} variant="floating">
            <Plus data-icon="inline-start" aria-hidden="true" />
            <CollapsibleTitle>
              <Trans>添加常用项目</Trans>
            </CollapsibleTitle>
            {adding ? (
              <CollapsibleDescription>
                <Trans>收起</Trans>
              </CollapsibleDescription>
            ) : (
              <Companion mood="chef" className="block size-8 shrink-0" />
            )}
            <CollapsibleChevron />
          </CollapsibleTrigger>
          <CollapsibleBackdrop
            inert={!adding}
            onClick={() => triggerRef.current?.focus()}
          />
          {/* 定位到记账内容区，始终只为入口占位；表单收起后保留输入。 */}
          <div className="absolute inset-x-0 top-16 bottom-2 z-30 overflow-clip pointer-events-none">
            <CollapsibleContent variant="floating" inert={!adding}>
              {notice && !message ? (
                <p className="mb-3 text-sm text-primary" role="status">
                  {notice}
                </p>
              ) : null}
              {message ? (
                <Alert className="mb-3 border-destructive/30 bg-destructive/5 p-3">
                  <AlertDescription className="text-destructive">
                    {message}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="relative">
                {/* 首次加载也保留完整表单尺寸，避免短提示突然撑成整张表单。 */}
                <fieldset disabled={!menu} aria-busy={!menu}>
                  <DishHint>
                    <Trans>
                      热量按每单位填写：摄入填正数，消耗填负数，可留空
                    </Trans>
                  </DishHint>
                  <DishRow
                    tags={sharedTags ?? tags}
                    onTagsChanged={reloadTags}
                    categoryId={menu?.id ?? ""}
                    onSaved={handleSaved}
                    onError={setMessage}
                  />
                </fieldset>
                {!menu ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm">
                    <MenuLoadStatus
                      phase={phase}
                      onRetry={() => setLoadRequest((request) => request + 1)}
                    />
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </MenuSurface>
    );
  }

  const listedCount = dishes?.filter((dish) => dish.listed).length ?? "—";

  return (
    <MenuSurface className="mx-auto flex w-full flex-col gap-2 min-h-0 flex-1 overflow-hidden">
      <header className="flex gap-2 flex-row items-start justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <BookkeepingTitle>
              <Trans>常用项目</Trans>
            </BookkeepingTitle>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Trans>常记的放这里 · {listedCount} 项可选</Trans>
          </p>
        </div>
      </header>
      {notice && !message ? (
        <p
          className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {message ? (
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {message}
          </AlertDescription>
        </Alert>
      ) : null}
      <ItemEditViewport
        headerRef={listHeaderRef}
        className="flex-1"
        scrollClassName="min-h-0 h-full overflow-y-auto overscroll-y-contain pb-3"
      >
        <DishList
          headerRef={listHeaderRef}
          categoryId={menu?.id ?? null}
          dishes={dishes}
          tags={sharedTags ?? tags}
          phase={phase}
          listRequested={listRequested}
          onRequest={() => setLoadRequest((request) => request || 1)}
          onRequestList={() => {
            setListRequested(true);
            setLoadRequest((request) => request || 1);
          }}
          onRetry={() => setLoadRequest((request) => request + 1)}
          onTagsChanged={reloadTags}
          onSaved={handleSaved}
          onError={setMessage}
        />
      </ItemEditViewport>
    </MenuSurface>
  );
}
