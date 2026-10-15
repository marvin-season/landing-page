"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Switch,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  Save,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Link } from "@/components/link/link";
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
  detailsSummaryCls,
  pageShellCls,
  pageTitleCls,
  totalBarCls,
  touchCls,
} from "./bbq-layout";
import { BBQ_MENU_CHANGED_EVENT } from "./bbq-menu-events";
import { bbqHomePath, bbqMenuPath } from "./bbq-paths";
import { BbqSearch } from "./bbq-search";
import { ItemTagBadge, ItemTagFilter } from "./item-tags";
import { useBbqNavigate } from "./use-bbq-nav";

const SEATS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const editorWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden rounded-xl bg-card
  grid-rows-[minmax(0,1fr)_auto]
`;

const editorMenuPaneCls = cls`
  min-h-0 min-w-0 border-b p-3 ${detailsMotionCls}
`;

const editorOrderPaneCls = cls`flex min-h-0 min-w-0 flex-col`;

const editorOrderBodyCls = cls`min-h-0 p-3 pb-5`;

const editorControlCls = cls`
  rounded-lg shadow-none transition-colors
  hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 focus-visible:ring-offset-0
  shinchan:rounded-lg
`;

const photoActionCls = cls`
  inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-card
  px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70
  has-disabled:pointer-events-none has-disabled:opacity-50 has-focus-visible:ring-1
  has-focus-visible:ring-inset has-focus-visible:ring-primary/50 h-11
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
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [seat, setSeat] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing" | "error">(
    orderId ? "loading" : "ready",
  );
  const [menuRequest, setMenuRequest] = useState(0);
  const menuRequested = menuRequest > 0;
  const [menuPhase, setMenuPhase] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [menuError, setMenuError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [search, setSearch] = useState("");

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
          setGroupingEnabled(existing.groupingEnabled ?? true);
          setSeat(existing.groupingEnabled === false ? null : existing.seat);
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

  useEffect(() => {
    // 原生 details 收起不会延后读取；只在首次展开后加载并保留菜单状态。
    if (menuRequest === 0) return;
    let cancelled = false;
    setMenuPhase("loading");
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
  }, [menuRequest, i18n]);

  useEffect(() => {
    if (!menuRequested) return;
    const refreshMenu = () => setMenuRequest((revision) => revision + 1);
    window.addEventListener(BBQ_MENU_CHANGED_EVENT, refreshMenu);
    return () => {
      window.removeEventListener(BBQ_MENU_CHANGED_EVENT, refreshMenu);
    };
  }, [menuRequested]);

  const activeTagFilter = resolveTagFilter(tags, tagFilter);
  const availableDishes = dishes.filter((dish) => dish.listed);

  const filteredDishes = availableDishes.filter(
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
  const canSave = lines.length > 0 && !saving && !processingPhotos;

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
        groupingEnabled,
        seat: groupingEnabled ? seat : null,
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
      <header className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className={pageTitleCls}>
                {order
                  ? t`修改${groupingEnabled ? t`订单` : t`记录`} #${order.seq}`
                  : groupingEnabled
                    ? t`新建订单`
                    : t`记一笔`}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order
                ? `${formatShanghaiHm(new Date(order.openedAt))} ${groupingEnabled ? t`开单` : t`记账`}`
                : groupingEnabled
                  ? t`选择打包或座号和项目后保存订单`
                  : t`这次记点什么？`}
            </p>
          </div>
        </div>
      </header>
      {message ? (
        <Alert
          className="max-h-20 shrink-0 overflow-auto border-destructive/30 bg-destructive/5 p-2"
          role="alert"
        >
          <AlertDescription className="text-destructive">
            {message}
          </AlertDescription>
        </Alert>
      ) : null}
      <fieldset
        className={`${editorWorkspaceCls} min-w-0`}
        disabled={saving}
        aria-busy={saving}
      >
        <div className="min-h-0 overflow-y-auto overscroll-y-contain scroll-py-3">
          <section className="border-b px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="order-grouping"
                  className="text-sm font-medium text-foreground"
                >
                  <Trans>按座号分组</Trans>
                </label>
                <Switch
                  id="order-grouping"
                  checked={groupingEnabled}
                  disabled={saving}
                  aria-label={t`启用分组（打包或座号）`}
                  onCheckedChange={(enabled) => {
                    setGroupingEnabled(enabled);
                    if (!enabled) setSeat(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {groupingEnabled
                    ? seat === null
                      ? t`当前选择打包`
                      : t`当前选择 ${seat} 号座`
                    : t`选填`}
                </p>
              </div>
              <label className="inline-flex min-h-9 shrink-0 items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {done ? t`已完成` : t`进行中`}
                </span>
                <Switch
                  checked={done}
                  disabled={saving}
                  aria-label={t`切换记录状态`}
                  onCheckedChange={setDone}
                />
              </label>
            </div>
            {groupingEnabled ? (
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                <Button
                  type="button"
                  variant={seat === null ? "default" : "outline"}
                  aria-pressed={seat === null}
                  className={`${touchCls} col-span-2 min-w-0 text-sm ${editorControlCls} px-2 ${seat === null ? "focus-visible:ring-primary-foreground/70" : "hover:bg-muted/70"}`}
                  onClick={() => setSeat(null)}
                >
                  <Package className="size-4" aria-hidden="true" />
                  <Trans>打包</Trans>
                </Button>
                {SEATS.map((number) => (
                  <Button
                    key={number}
                    type="button"
                    variant={seat === number ? "default" : "outline"}
                    aria-pressed={seat === number}
                    className={`${touchCls} min-w-0 text-sm ${editorControlCls} px-2 ${seat === number ? "focus-visible:ring-primary-foreground/70" : "hover:bg-muted/70"}`}
                    onClick={() => setSeat(number)}
                  >
                    {number}
                  </Button>
                ))}
              </div>
            ) : null}
          </section>
          <details
            className={editorMenuPaneCls}
            onToggle={(event) => {
              if (event.currentTarget.open)
                setMenuRequest((request) => request || 1);
            }}
          >
            <summary className={detailsSummaryCls}>
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
              <ChevronDown className={detailsChevronCls} aria-hidden="true" />
            </summary>
            <div className="min-h-0 overflow-clip">
              {menuRequested ? (
                menuPhase === "loading" ? (
                  <p
                    className="py-8 text-center text-sm text-muted-foreground"
                    role="status"
                  >
                    <Trans>读取常用项目中…</Trans>
                  </p>
                ) : menuPhase === "error" ? (
                  <div className="py-3">
                    <p role="alert">{menuError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMenuRequest((revision) => revision + 1)}
                    >
                      <Trans>Retry</Trans>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 z-10 bg-card pb-2 mt-2 flex min-w-0 items-center gap-1.5">
                      <ItemTagFilter
                        tags={tags}
                        value={activeTagFilter}
                        onChange={setTagFilter}
                      />
                      {availableDishes.length > 0 ? (
                        <div className="min-w-0 flex-1">
                          <BbqSearch
                            value={search}
                            onChange={setSearch}
                            label={t`搜索项目名称…`}
                          />
                        </div>
                      ) : null}
                    </div>
                    {availableDishes.length === 0 ? (
                      <div className="mt-3 flex min-h-36 flex-col items-center justify-center rounded-lg bg-muted/40 px-4 text-center">
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
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="mt-3"
                        >
                          <Link href={bbqMenuPath()}>
                            <Trans>添加常用项目</Trans>
                          </Link>
                        </Button>
                      </div>
                    ) : filteredDishes.length === 0 ? (
                      <p
                        className="py-8 text-center text-sm text-muted-foreground"
                        role="status"
                      >
                        <Trans>没有匹配的项目，请换个关键词</Trans>
                      </p>
                    ) : (
                      <div className="mt-2 grid min-h-0 grid-cols-2 gap-1.5 auto-rows-max content-start p-1 max-h-[min(16rem,40dvh)] overflow-y-auto overscroll-y-contain">
                        {filteredDishes.map((dish) => (
                          <Button
                            key={dish.id}
                            type="button"
                            variant="ghost"
                            className={`${touchCls} h-auto w-full justify-between rounded-lg px-2.5 py-2 text-left text-sm ${editorControlCls} hover:bg-muted/70 min-w-0 whitespace-nowrap ${selectedQuantities.has(dish.id) ? "bg-primary/5" : "bg-muted/40"}`}
                            aria-label={t`添加 ${dish.name}，已选 ${selectedQuantities.get(dish.id) ?? 0} 件`}
                            onClick={() => addDish(dish)}
                          >
                            <span className="min-w-0 flex-1">
                              <span
                                className="block truncate"
                                title={dish.name}
                              >
                                {dish.name}
                              </span>
                              {tags
                                .filter((tag) =>
                                  getDishTagIds(dish).includes(tag.id),
                                )
                                .map((tag) => (
                                  <ItemTagBadge key={tag.id} tag={tag} />
                                ))}
                              <span className="mt-0.5 block text-xs font-normal tabular-nums text-muted-foreground truncate">
                                {formatYuan(dish.priceCents)}/{dish.unit}
                                {dish.caloriesKcal != null ? (
                                  <>
                                    <span className="mx-1" aria-hidden="true">
                                      ·
                                    </span>
                                    {formatCalories(
                                      i18n,
                                      summarizeCalories([
                                        { ...dish, quantity: 1 },
                                      ]),
                                    )}
                                  </>
                                ) : null}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-center gap-0.5">
                              <Plus className="size-4" aria-hidden="true" />
                              {selectedQuantities.has(dish.id) ? (
                                <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs tabular-nums text-primary-foreground">
                                  {selectedQuantities.get(dish.id)}
                                </span>
                              ) : null}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )
              ) : null}
            </div>
          </details>
          <section className={editorOrderPaneCls}>
            <div className={editorOrderBodyCls}>
              <section>
                <div className="flex items-end justify-between gap-3 sticky top-0 z-10 bg-card pb-2">
                  <div>
                    <h2 className="text-sm font-medium text-foreground">
                      <Trans>这一笔</Trans>
                    </h2>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t`${lines.length} 项 · ${itemCount} 件`}
                  </span>
                </div>
                <p className="text-xs tabular-nums text-muted-foreground break-words">
                  <Trans>
                    热量 {formatCalories(i18n, summarizeCalories(lines))}
                  </Trans>
                </p>
                {lines.length === 0 ? (
                  <div className="mt-2 flex min-h-16 flex-row items-center justify-center gap-2 rounded-lg bg-muted/40 px-3 text-center">
                    <BbqCompanion
                      mood={groupingEnabled ? "chef" : "hello"}
                      className="block size-12 shrink-0"
                    />
                    <p className="text-xs text-muted-foreground">
                      <Trans>还没有添加项目</Trans>
                    </p>
                  </div>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {lines.map((line) => (
                      <li
                        key={line.key}
                        className="flex items-center gap-1.5 border-b border-border/60 px-0.5 py-2 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {line.name}
                          </p>
                          {line.tags?.map((tag) => (
                            <ItemTagBadge key={tag.id} tag={tag} />
                          ))}
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            {formatYuan(line.priceCents)}/{line.unit}
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            {formatYuan(
                              lineCents(line.priceCents, line.quantity),
                            )}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            <Trans>
                              热量{" "}
                              {formatCalories(i18n, summarizeCalories([line]))}
                            </Trans>
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
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
                          variant="outline"
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
              <section className="mt-3 border-t pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Camera
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      <h2 className="text-sm font-medium text-foreground">
                        <Trans>附张照片</Trans>
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <Trans>小票或随手拍，最多 {MAX_ORDER_PHOTOS} 张</Trans>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <BbqCompanion
                      mood="photo-pose"
                      className="block size-14 shrink-0"
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {photos.length}/{MAX_ORDER_PHOTOS}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
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
                      className="sr-only"
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
                      className="sr-only"
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
                  <ul className="mt-2 grid grid-cols-3 gap-2">
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
                <section className="mt-4 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={saving}
                    onClick={() => void removeOrder()}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <Trans>删除这条记录</Trans>
                  </Button>
                </section>
              ) : null}
            </div>
          </section>
        </div>
        <div className={totalBarCls}>
          <div className="mx-auto grid w-full max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p
              className="text-xl font-semibold tabular-nums tracking-tight truncate leading-tight min-w-0"
              title={formatYuan(total)}
            >
              {formatYuan(total)}
            </p>
            <Button
              type="button"
              className={`px-3 ${editorControlCls} focus-visible:ring-primary-foreground/70 min-h-11 w-full`}
              disabled={!canSave}
              onClick={() => void save()}
            >
              {saving ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : done ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
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
    </div>
  );
}
