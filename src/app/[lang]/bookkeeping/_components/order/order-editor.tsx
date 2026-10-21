"use client";
import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleDescription,
  CollapsibleTitle,
  CollapsibleTrigger,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Plus,
  ReceiptText,
  Save,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatShanghaiHm } from "@/lib/bbq/business-day";
import { formatYuan } from "@/lib/bbq/money";
import { useOrderEditor } from "../../_hooks/use-order-editor";
import { errorMessage } from "../../_lib/errors";
import { settingsPath } from "../../_lib/paths";
import { DishRow } from "../menu/dish-row";
import { ItemTagFilter } from "../menu/item-tags";
import { MenuEditor } from "../menu/menu-editor";
import {
  BookkeepingCard,
  BookkeepingPage,
  BookkeepingTitle,
} from "../shared/bookkeeping-layout";
import { ItemEditViewport } from "../shared/item-edit-viewport";
import { LocalLink as Link } from "../shared/local-link";
import { SearchInput } from "../shared/search-input";
import { OrderLines } from "./order-lines";
import { OrderPhotos } from "./order-photos";

export function OrderEditor({ orderId }: { orderId?: string }) {
  const { i18n, t } = useLingui();
  const {
    order,
    groupingSettings,
    groupingError,
    groupingEnabled,
    groupName,
    groupOptions,
    setGroupName,
    done,
    lines,
    photos,
    phase,
    message,
    saving,
    processingPhotos,
    tags,
    setTags,
    dishes,
    menuPhase,
    menuError,
    setMenuRevision,
    setMessage,
    search,
    setSearch,
    activeTagFilter,
    setTagFilter,
    availableDishes,
    filteredDishes,
    selectedQuantities,
    total,
    itemCount,
    canSave,
    reloadTags,
    handleItemSaved,
    addDish,
    changeQuantity,
    addPhotos,
    removePhoto,
    save,
    removeOrder,
  } = useOrderEditor(orderId);
  const [menuOpen, setMenuOpen] = useState(true);
  const itemHeaderRef = useRef<HTMLDivElement>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  if (phase === "loading") {
    return (
      <div
        className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        <Trans>读取记录中…</Trans>
      </div>
    );
  }

  if (phase === "error" || phase === "missing") {
    return (
      <div className="mx-auto flex min-h-48 w-full max-w-xl flex-col justify-center gap-3">
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {phase === "missing" ? t`没有找到这条记录` : message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <BookkeepingPage className="min-h-0 overflow-hidden flex-1">
      <header className="flex shrink-0 flex-col gap-1">
        <BookkeepingTitle>
          {order
            ? t`修改${groupingEnabled ? t`订单` : t`记录`} #${order.seq}`
            : groupingEnabled
              ? t`新建订单`
              : t`记一笔`}
        </BookkeepingTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {order
            ? `${formatShanghaiHm(new Date(order.openedAt))} ${groupingEnabled ? t`开单` : t`记账`}`
            : groupingEnabled
              ? t`选择分组和项目后保存订单`
              : t`这次记点什么？`}
        </p>
      </header>
      {message || groupingError ? (
        <Alert
          className="max-h-20 shrink-0 overflow-auto border-destructive/30 bg-destructive/5 p-2"
          role="alert"
        >
          <AlertDescription className="text-destructive">
            {message ?? errorMessage(i18n, groupingError)}
          </AlertDescription>
        </Alert>
      ) : null}
      <Collapsible
        open={cartOpen}
        onOpenChange={(next) => {
          if (next) setAddingItem(false);
          setCartOpen(next);
        }}
        asChild
      >
        <fieldset
          className={`grid min-h-0 flex-1 overflow-hidden grid-rows-[minmax(0,1fr)_auto] min-w-0`}
          disabled={saving}
          aria-busy={saving}
        >
          {/* 外框只裁剪，不承接文件输入框聚焦时的隐式滚动。 */}
          <div className="relative min-h-0 overflow-clip">
            <div
              className="h-full min-h-0 flex flex-col gap-3 isolate"
              inert={cartOpen}
            >
              <MenuEditor
                variant="inline"
                sharedTags={tags}
                onTagsChanged={setTags}
                open={addingItem}
                onOpenChange={setAddingItem}
              />
              <div className="min-h-0 flex-1 flex flex-col" inert={addingItem}>
                <ItemEditViewport
                  headerRef={itemHeaderRef}
                  className="flex-1"
                  scrollClassName="min-h-0 overflow-y-auto overscroll-y-contain scroll-py-3 flex flex-col gap-3 pb-3 h-full"
                >
                  {groupingEnabled ? (
                    <BookkeepingCard variant="padded">
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="order-group"
                          className="text-sm font-medium text-foreground shrink-0"
                        >
                          <Trans>分组</Trans>
                        </label>
                        <Select
                          value={
                            groupName === undefined
                              ? "legacy"
                              : groupName === null
                                ? "none"
                                : `group:${groupName}`
                          }
                          onValueChange={(value) =>
                            setGroupName(
                              value === "legacy"
                                ? undefined
                                : value === "none"
                                  ? null
                                  : value.slice(6),
                            )
                          }
                        >
                          <SelectTrigger
                            id="order-group"
                            className="min-w-0 h-11 bg-muted/30 flex-1 data-[size=default]:h-11 border-border/60 shadow-none rounded-lg"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">
                                <Trans>不分组</Trans>
                              </SelectItem>
                              {order &&
                              order.groupingEnabled !== false &&
                              order.groupName === undefined ? (
                                <SelectItem value="legacy">
                                  {order.seat === null
                                    ? t`打包`
                                    : t`${order.seat} 号座`}
                                </SelectItem>
                              ) : null}
                              {groupOptions.map((name) => (
                                <SelectItem key={name} value={`group:${name}`}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      {groupingSettings?.names.length === 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <Link
                            href={settingsPath()}
                            className="text-primary underline underline-offset-4"
                          >
                            <Trans>到设置中添加分组</Trans>
                          </Link>
                        </p>
                      ) : null}
                    </BookkeepingCard>
                  ) : null}
                  <Collapsible
                    variant="card"
                    className="min-h-0 min-w-0"
                    open={menuOpen}
                    onOpenChange={(open) => setMenuOpen(open)}
                  >
                    <CollapsibleTrigger variant="flush">
                      <Plus data-icon="inline-start" aria-hidden="true" />
                      <CollapsibleTitle className="truncate">
                        <Trans>选择项目</Trans>
                      </CollapsibleTitle>
                      <CollapsibleDescription className="tabular-nums shrink-0">
                        {menuPhase === "ready" ? (
                          <Trans>{availableDishes.length} 项</Trans>
                        ) : (
                          "—"
                        )}
                      </CollapsibleDescription>
                      <CollapsibleChevron />
                    </CollapsibleTrigger>
                    <CollapsibleContent variant="collapse">
                      <div className="border-t border-border/60">
                        {menuPhase === "loading" ? (
                          <p
                            className="py-8 text-center text-sm text-muted-foreground"
                            role="status"
                          >
                            <Trans>读取常用项目中…</Trans>
                          </p>
                        ) : menuPhase === "error" ? (
                          <div className="p-3 flex flex-col items-start gap-3">
                            <p role="alert">{menuError}</p>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setMenuRevision((revision) => revision + 1)
                              }
                            >
                              <Trans>Retry</Trans>
                            </Button>
                          </div>
                        ) : (
                          <div className="p-2.5">
                            <div
                              ref={itemHeaderRef}
                              className="flex min-w-0 items-center gap-1.5 [&_[data-slot=input]]:h-9 [&_[data-slot=input]]:pr-9 [&_[data-slot=input]]:bg-muted/30 [&_[data-slot=input]]:placeholder:text-xs [&_[data-slot=select-trigger]]:h-9 [&_[data-slot=select-trigger]]:w-24 [&_[data-slot=select-trigger]]:px-2 [&_[data-slot=select-trigger]]:text-xs [&_[data-slot=select-trigger]]:bg-transparent"
                            >
                              {dishes.length > 0 ? (
                                <div className="min-w-0 flex-1 [&_[data-slot=button]]:size-9 [&_svg]:size-3.5">
                                  <SearchInput
                                    value={search}
                                    onChange={setSearch}
                                    label={t`搜索项目名称…`}
                                  />
                                </div>
                              ) : null}
                              <ItemTagFilter
                                tags={tags}
                                value={activeTagFilter}
                                onChange={setTagFilter}
                              />
                            </div>
                            {dishes.length === 0 ? (
                              <div className="mt-3 flex min-h-36 flex-col items-center justify-center px-4 text-center pb-3">
                                <UtensilsCrossed
                                  className="size-7 text-muted-foreground/60"
                                  aria-hidden="true"
                                />
                                <p className="mt-2 text-sm font-medium text-foreground">
                                  <Trans>先添几个常用项目</Trans>
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  <Trans>比如早餐、咖啡，或一次跑步。</Trans>
                                </p>
                              </div>
                            ) : filteredDishes.length === 0 ? (
                              <p
                                className="py-8 text-center text-sm text-muted-foreground"
                                role="status"
                              >
                                <Trans>没有匹配的项目，请换个关键词</Trans>
                              </p>
                            ) : null}
                            <div
                              className="mt-2 grid min-h-0 grid-cols-1 gap-1.5 auto-rows-max content-start p-1"
                              hidden={filteredDishes.length === 0}
                            >
                              {dishes.map((dish) => (
                                <div
                                  key={dish.id}
                                  className={
                                    filteredDishes.includes(dish)
                                      ? "min-w-0"
                                      : "hidden"
                                  }
                                >
                                  <DishRow
                                    dish={dish}
                                    categoryId={dish.categoryId}
                                    tags={tags}
                                    managing={false}
                                    quantity={
                                      selectedQuantities.get(dish.id) ?? 0
                                    }
                                    onAdd={addDish}
                                    onTagsChanged={reloadTags}
                                    onSaved={handleItemSaved}
                                    onError={setMessage}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </ItemEditViewport>
              </div>
            </div>
            {cartOpen ? (
              <button
                type="button"
                className="absolute inset-0 bg-background/60 backdrop-blur-xs"
                tabIndex={-1}
                aria-label={t`收起`}
                onClick={() => setCartOpen(false)}
              />
            ) : null}
            <CollapsibleContent
              className="absolute inset-x-0 bottom-0 max-h-[92%] grid grid-rows-[auto_minmax(0,1fr)] rounded-t-2xl border border-b-0 border-border/60 bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-200 motion-reduce:animate-none"
              onKeyDown={(event) => {
                if (event.key === "Escape") setCartOpen(false);
              }}
              aria-label={t`这一笔`}
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-11 w-full justify-between rounded-none px-3 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ReceiptText
                      className="size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      <Trans>这一笔</Trans>
                    </span>
                    <span className="text-xs font-normal tabular-nums text-muted-foreground">
                      {t`${lines.length} 项 · ${itemCount} 件`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Trans>收起</Trans>
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </span>
                </Button>
              </CollapsibleTrigger>
              <div className="min-h-0 flex flex-col gap-3 overflow-y-auto overscroll-y-contain p-3">
                <OrderLines
                  lines={lines}
                  groupingEnabled={groupingEnabled}
                  changeQuantity={changeQuantity}
                />
                <OrderPhotos
                  photos={photos}
                  processingPhotos={processingPhotos}
                  addPhotos={addPhotos}
                  removePhoto={removePhoto}
                />
                {order ? (
                  <section className="pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full min-h-11"
                      disabled={saving}
                      onClick={() => void removeOrder()}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <Trans>删除这条记录</Trans>
                    </Button>
                  </section>
                ) : null}
              </div>
            </CollapsibleContent>
          </div>
          <div className="p-2 border-t border-border/60 bg-background">
            <div className="mx-auto grid w-full max-w-xl grid-cols-[minmax(0,1fr)_minmax(7rem,auto)] items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-11 min-w-0 justify-start gap-2 rounded-lg px-1 py-1 text-left"
                >
                  <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShoppingBasket className="size-5" aria-hidden="true" />
                    {itemCount > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 tabular-nums text-primary-foreground">
                        {itemCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-xl font-semibold tabular-nums tracking-tight leading-tight"
                      title={formatYuan(total)}
                    >
                      {formatYuan(total)}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      <Trans>这一笔</Trans>
                    </span>
                  </span>
                  <ChevronDown
                    className="size-4 shrink-0 rotate-180 transition-transform duration-200 [[data-state=open]_&]:rotate-0 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Button>
              </CollapsibleTrigger>
              <Button
                type="button"
                size={"sm"}
                className={`px-4 focus-visible:ring-primary-foreground/70 w-full text-sm gap-1.5`}
                disabled={!canSave}
                onClick={() => void save()}
              >
                {saving ? (
                  <LoaderCircle
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : done ? (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                ) : (
                  <Save className="size-3.5" aria-hidden="true" />
                )}
                {saving
                  ? t`保存中…`
                  : order
                    ? t`保存修改`
                    : groupingEnabled
                      ? t`保存订单`
                      : t`保存记录`}
              </Button>
            </div>
          </div>
        </fieldset>
      </Collapsible>
    </BookkeepingPage>
  );
}
