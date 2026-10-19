"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleContent,
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
  Camera,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  Save,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatShanghaiHm } from "@/lib/bbq/business-day";
import { summarizeCalories } from "@/lib/bbq/calories";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan, lineCents, totalCents } from "@/lib/bbq/money";
import { createOrderPhoto, MAX_ORDER_PHOTOS } from "@/lib/bbq/order-photo";
import {
  getDishTagIds,
  getLineTags,
  matchesTag,
  resolveTagFilter,
} from "@/lib/bbq/tags";
import type {
  Dish,
  ItemTag,
  Order,
  OrderPhoto,
  OrderStatus,
} from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { bbqErrorMessage } from "./bbq-errors";
import { formatCalories } from "./bbq-i18n";
import {
  cls,
  detailsChevronCls,
  detailsMotionCls,
  pageShellCls,
  pageTitleCls,
} from "./bbq-layout";
import { BbqLink as Link } from "./bbq-link";
import {
  BBQ_MENU_CHANGED_EVENT,
  notifyBbqMenuChanged,
} from "./bbq-menu-events";
import { bbqHomePath, bbqSettingsPath } from "./bbq-paths";
import { BbqSearch } from "./bbq-search";
import { settingsCardCls, settingsSummaryCls } from "./bbq-settings-styles";
import { ItemEditViewport } from "./item-edit-viewport";
import { ItemTagBadge, ItemTagFilter } from "./item-tags";
import { DishRow, MenuEditor } from "./menu-editor";
import { useBbqNavigate } from "./use-bbq-nav";
import { useGroupingSettings } from "./use-grouping-settings";

const editorWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden
  grid-rows-[minmax(0,1fr)_auto]
`;

const editorMenuPaneCls = cls`
  min-h-0 min-w-0 ${detailsMotionCls} ${settingsCardCls}
`;

const editorItemToolbarCls = cls`
  flex min-w-0 items-center gap-1.5
  [&_[data-slot=input]]:h-9 [&_[data-slot=input]]:pr-9
  [&_[data-slot=input]]:bg-muted/30 [&_[data-slot=input]]:placeholder:text-xs
  [&_[data-slot=select-trigger]]:h-9 [&_[data-slot=select-trigger]]:w-24
  [&_[data-slot=select-trigger]]:px-2 [&_[data-slot=select-trigger]]:text-xs
  [&_[data-slot=select-trigger]]:bg-transparent
`;

const editorSectionCls = cls`${settingsCardCls} p-3`;

const editorOrderBodyCls = cls`min-h-0 flex flex-col gap-3 overflow-y-auto overscroll-y-contain p-3`;

const editorCartPanelCls = cls`
  absolute inset-x-0 bottom-0 max-h-[92%] grid grid-rows-[auto_minmax(0,1fr)]
  rounded-t-2xl border border-b-0 border-border/60 bg-background shadow-lg
  data-[state=open]:animate-in data-[state=closed]:animate-out
  data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom
  duration-200 motion-reduce:animate-none
`;

const editorControlCls = cls`
  rounded-lg shadow-none transition-colors
  hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 focus-visible:ring-offset-0
  shinchan:rounded-lg
`;

const photoActionCls = cls`
  inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-muted/30
  px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/70
  has-disabled:pointer-events-none has-disabled:opacity-50 has-focus-visible:ring-1
  has-focus-visible:ring-inset has-focus-visible:ring-primary/50 h-11 min-w-0 text-center
  border border-border/60 relative
`;

type DraftLine = {
  key: string;
  tags?: ItemTag[];
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  caloriesKcal?: number | null;
  unit: string;
  quantity: number;
};

async function readMenu() {
  const [dishes, tags] = await Promise.all([
    bbqStore.listDishes(),
    bbqStore.listTags(),
  ]);
  return { dishes, tags };
}

export function OrderEditor({ orderId }: { orderId?: string }) {
  const { i18n, t } = useLingui();
  const navigate = useBbqNavigate();
  const [tags, setTags] = useState<ItemTag[]>([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const { settings: groupingSettings, error: groupingError } =
    useGroupingSettings();
  const groupingEnabled = groupingSettings?.enabled ?? false;
  const [groupName, setGroupName] = useState<string | null | undefined>(null);
  const groupOptions = [
    ...new Set([
      ...(groupingSettings?.names ?? []),
      ...(groupName ? [groupName] : []),
    ]),
  ];
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing" | "error">(
    orderId ? "loading" : "ready",
  );
  const [menuRevision, setMenuRevision] = useState(0);
  const [menuOpen, setMenuOpen] = useState(true);
  const [menuPhase, setMenuPhase] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [menuError, setMenuError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [search, setSearch] = useState("");
  const itemHeaderRef = useRef<HTMLDivElement>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const existing = await bbqStore.getOrder(orderId);
        if (cancelled) return;
        if (orderId && !existing) {
          setPhase("missing");
          return;
        }
        if (existing) {
          setOrder(existing);
          setGroupName(
            existing.groupingEnabled === false ? null : existing.groupName,
          );
          setDone(existing.status === "done");
          setPhotos(existing.photos);
          setLines(
            existing.lines.map((line) => ({
              key: line.id,
              tags: getLineTags(line),
              id: line.id,
              dishId: line.dishId,
              name: line.name,
              priceCents: line.priceCents,
              caloriesKcal: line.caloriesKcal,
              unit: line.unit,
              quantity: line.quantity,
            })),
          );
        }
        setPhase("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(bbqErrorMessage(i18n, error));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, i18n]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: menuRevision explicitly refreshes the menu after retries and item changes.
  useEffect(() => {
    let cancelled = false;
    // 保存项目后后台刷新，避免卸载正在填写的项目表单。
    setMenuPhase((current) => (current === "ready" ? current : "loading"));
    setMenuError(null);
    void readMenu()
      .then((menu) => {
        if (cancelled) return;
        setDishes(menu.dishes);
        setTags(menu.tags);
        setMenuPhase("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMenuError(bbqErrorMessage(i18n, error));
        setMenuPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [menuRevision, i18n]);

  useEffect(() => {
    const refreshMenu = () => setMenuRevision((revision) => revision + 1);
    window.addEventListener(BBQ_MENU_CHANGED_EVENT, refreshMenu);
    return () => {
      window.removeEventListener(BBQ_MENU_CHANGED_EVENT, refreshMenu);
    };
  }, []);

  async function reloadTags() {
    setTags(await bbqStore.listTags());
  }

  async function handleItemSaved() {
    setMessage(null);
    notifyBbqMenuChanged();
  }

  const activeTagFilter = resolveTagFilter(tags, tagFilter);
  const availableDishes = dishes.filter((dish) => dish.listed);

  const visibleDishes = dishes;
  const filteredDishes = visibleDishes.filter(
    (dish) =>
      dish.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      matchesTag(dish, activeTagFilter),
  );
  const selectedQuantities = new Map<string, number>();
  for (const line of lines) {
    if (line.dishId)
      selectedQuantities.set(
        line.dishId,
        (selectedQuantities.get(line.dishId) ?? 0) + line.quantity,
      );
  }

  const total = totalCents(
    lines.map((line) => ({
      lineCents: lineCents(line.priceCents, line.quantity),
    })),
  );
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
  const canSave =
    lines.length > 0 &&
    !saving &&
    !processingPhotos &&
    groupingSettings !== null &&
    !groupingError;

  function addDish(dish: Dish) {
    setLines((current) => {
      const index = current.findIndex((line) => line.dishId === dish.id);
      if (index === -1) {
        return [
          ...current,
          {
            key: `new:${dish.id}`,
            tags: tags.filter((tag) => getDishTagIds(dish).includes(tag.id)),
            dishId: dish.id,
            name: dish.name,
            priceCents: dish.priceCents,
            caloriesKcal: dish.caloriesKcal,
            unit: dish.unit,
            quantity: 1,
          },
        ];
      }
      return current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  }

  function changeQuantity(key: string, delta: number) {
    setLines((current) =>
      current.flatMap((line) => {
        if (line.key !== key) return [line];
        const quantity = line.quantity + delta;
        if (quantity <= 0) return [];
        return [{ ...line, quantity }];
      }),
    );
  }

  async function addPhotos(files: FileList | null) {
    if (!files || processingPhotos) return;
    const selectedFiles = Array.from(files);
    const remaining = MAX_ORDER_PHOTOS - photos.length;
    if (remaining <= 0) {
      setMessage(t`每条记录最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
      return;
    }

    setProcessingPhotos(true);
    setMessage(null);
    try {
      const results = await Promise.allSettled(
        selectedFiles.slice(0, remaining).map(createOrderPhoto),
      );
      const nextPhotos = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      setPhotos((current) => [...current, ...nextPhotos]);

      if (results.some((result) => result.status === "rejected")) {
        setMessage(t`部分照片读取失败，请选择浏览器可读取的图片`);
      } else if (selectedFiles.length > remaining) {
        setMessage(t`每条记录最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
      }
    } finally {
      setProcessingPhotos(false);
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    const status: OrderStatus = done ? "done" : "open";
    try {
      const saved = await bbqStore.saveOrder({
        id: order?.id,
        // 关闭全局分组只隐藏选择器；编辑旧记录时保留其历史分组。
        ...(groupingEnabled
          ? { groupingEnabled: true, groupName }
          : order
            ? {}
            : { groupingEnabled: false, groupName: null }),
        seat:
          groupingEnabled && groupName !== undefined
            ? null
            : (order?.seat ?? null),
        status,
        photos,
        lines: lines.map((line) => ({
          id: line.id,
          dishId: line.dishId,
          name: line.name,
          priceCents: line.priceCents,
          caloriesKcal: line.caloriesKcal,
          unit: line.unit,
          quantity: line.quantity,
        })),
      });
      navigate(bbqHomePath(saved.businessDayKey));
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
      setSaving(false);
    }
  }

  async function removeOrder() {
    if (!order || saving) return;
    if (!window.confirm(t`删除这条记录？`)) return;
    setSaving(true);
    try {
      await bbqStore.deleteOrder(order.id);
      navigate(bbqHomePath(order.businessDayKey));
    } catch (error) {
      setMessage(bbqErrorMessage(i18n, error));
      setSaving(false);
    }
  }

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
    <div className={`${pageShellCls} min-h-0 overflow-hidden flex-1`}>
      <header className="flex shrink-0 flex-col gap-1">
        <h1 className={pageTitleCls}>
          {order
            ? t`修改${groupingEnabled ? t`订单` : t`记录`} #${order.seq}`
            : groupingEnabled
              ? t`新建订单`
              : t`记一笔`}
        </h1>
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
            {message ?? bbqErrorMessage(i18n, groupingError)}
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
          className={`${editorWorkspaceCls} min-w-0`}
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
                    <section className={editorSectionCls}>
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
                            href={bbqSettingsPath()}
                            className="text-primary underline underline-offset-4"
                          >
                            <Trans>到设置中添加分组</Trans>
                          </Link>
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  <details
                    className={editorMenuPaneCls}
                    open={menuOpen}
                    onToggle={(event) => setMenuOpen(event.currentTarget.open)}
                  >
                    <summary className={settingsSummaryCls}>
                      <Plus
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        <Trans>选择项目</Trans>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0 font-normal">
                        {menuPhase === "ready" ? (
                          <Trans>{availableDishes.length} 项</Trans>
                        ) : (
                          "—"
                        )}
                      </span>
                      <ChevronDown
                        className={detailsChevronCls}
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="min-h-0 overflow-clip border-t border-border/60">
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
                            className={editorItemToolbarCls}
                          >
                            {dishes.length > 0 ? (
                              <div className="min-w-0 flex-1 [&_[data-slot=button]]:size-9 [&_svg]:size-3.5">
                                <BbqSearch
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
                          {visibleDishes.length === 0 ? (
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
                  </details>
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
              className={editorCartPanelCls}
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
              <div className={editorOrderBodyCls}>
                <section className={editorSectionCls}>
                  <p className="text-xs tabular-nums text-muted-foreground break-words rounded-lg bg-muted/30 px-2.5 py-2">
                    <Trans>
                      热量 {formatCalories(i18n, summarizeCalories(lines))}
                    </Trans>
                  </p>
                  {lines.length === 0 ? (
                    <div className="mt-3 flex min-h-28 flex-col items-center justify-center gap-2 text-center py-2">
                      <BbqCompanion
                        mood={groupingEnabled ? "chef" : "hello"}
                        className="block size-16 shrink-0"
                      />
                      <p className="text-xs text-muted-foreground">
                        <Trans>还没有添加项目</Trans>
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-2 flex flex-col">
                      {lines.map((line) => (
                        <li
                          key={line.key}
                          className="grid items-center gap-1 border-b border-border/40 py-3 last:border-b-0 grid-cols-[minmax(0,1fr)_2.75rem_minmax(1.5rem,auto)_2.75rem] sm:gap-2 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {line.name}
                            </p>
                            <div className="flex min-w-0 flex-wrap gap-1 empty:hidden mt-1">
                              {line.tags?.map((tag) => (
                                <ItemTagBadge key={tag.id} tag={tag} />
                              ))}
                            </div>
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground wrap-anywhere">
                              {formatYuan(line.priceCents)}/{line.unit}
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              {formatYuan(
                                lineCents(line.priceCents, line.quantity),
                              )}
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground wrap-anywhere">
                              <Trans>
                                热量{" "}
                                {formatCalories(
                                  i18n,
                                  summarizeCalories([line]),
                                )}
                              </Trans>
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`shrink-0 ${editorControlCls} hover:bg-muted/70 size-11`}
                            aria-label={
                              line.quantity === 1
                                ? t`移除 ${line.name}`
                                : t`减少 ${line.name} 数量`
                            }
                            onClick={() => changeQuantity(line.key, -1)}
                          >
                            {line.quantity === 1 ? (
                              <Trash2 className="size-4" aria-hidden="true" />
                            ) : (
                              <Minus className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                          <span className="min-w-6 text-center text-sm font-medium tabular-nums">
                            {line.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`shrink-0 ${editorControlCls} hover:bg-muted/70 size-11`}
                            aria-label={t`增加 ${line.name} 数量`}
                            onClick={() => changeQuantity(line.key, 1)}
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
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
                      {/* <BbqCompanion
                      mood="photo-pose"
                      className="block size-14 shrink-0"
                    /> */}
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
                        disabled={
                          processingPhotos || photos.length >= MAX_ORDER_PHOTOS
                        }
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
                        disabled={
                          processingPhotos || photos.length >= MAX_ORDER_PHOTOS
                        }
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
    </div>
  );
}
