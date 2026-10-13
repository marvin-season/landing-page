"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Switch,
} from "@landing-page/design-system";
import {
  Camera,
  CheckCircle2,
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
import { formatCalories, summarizeCalories } from "@/lib/bbq/calories";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan, lineCents, totalCents } from "@/lib/bbq/money";
import { createOrderPhoto, MAX_ORDER_PHOTOS } from "@/lib/bbq/order-photo";
import type { Dish, Order, OrderPhoto, OrderStatus } from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { bbqErrorMessage } from "./bbq-errors";
import {
  cls,
  pageShellCls,
  pageTitleCls,
  totalBarCls,
  touchCls,
} from "./bbq-layout";
import { BBQ_MENU_CHANGED_EVENT } from "./bbq-menu-events";
import { bbqHomePath, bbqMenuPath } from "./bbq-paths";
import { BbqSearch } from "./bbq-search";
import { useBbqNavigate } from "./use-bbq-nav";

const SEATS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const editorWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden rounded-xl bg-card
  grid-rows-[minmax(0,1fr)_auto]
`;

const editorMenuPaneCls = cls`min-h-0 min-w-0 border-b p-3 flex flex-col`;

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
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  caloriesKcal?: number | null;
  unit: string;
  quantity: number;
};

function readMenu() {
  return bbqStore.listDishes();
}

export function OrderEditor({ orderId }: { orderId?: string }) {
  const navigate = useBbqNavigate();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [seat, setSeat] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const menu = await readMenu();
        const existing = orderId ? await bbqStore.getOrder(orderId) : null;
        if (cancelled) return;
        if (orderId && !existing) {
          setPhase("missing");
          return;
        }
        setDishes(menu);
        if (existing) {
          setOrder(existing);
          setGroupingEnabled(existing.groupingEnabled ?? true);
          setSeat(existing.groupingEnabled === false ? null : existing.seat);
          setDone(existing.status === "done");
          setPhotos(existing.photos);
          setLines(
            existing.lines.map((line) => ({
              key: line.id,
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
        setMessage(bbqErrorMessage(error));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const refreshMenu = () => {
      void readMenu()
        .then((menu) => {
          if (cancelled) return;
          setDishes(menu);
        })
        .catch((error: unknown) => {
          if (!cancelled) setMessage(bbqErrorMessage(error));
        });
    };
    window.addEventListener(BBQ_MENU_CHANGED_EVENT, refreshMenu);
    return () => {
      cancelled = true;
      window.removeEventListener(BBQ_MENU_CHANGED_EVENT, refreshMenu);
    };
  }, []);

  const availableDishes = dishes.filter((dish) => dish.listed);

  const filteredDishes = availableDishes.filter((dish) =>
    dish.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
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

  function addDish(dish: Dish) {
    setLines((current) => {
      const index = current.findIndex((line) => line.dishId === dish.id);
      if (index === -1) {
        return [
          ...current,
          {
            key: `new:${dish.id}`,
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
      setMessage(`每条记录最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
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
        setMessage("部分照片读取失败，请选择浏览器可读取的图片");
      } else if (selectedFiles.length > remaining) {
        setMessage(`每条记录最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
      }
    } finally {
      setProcessingPhotos(false);
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  async function save() {
    if (saving || processingPhotos) return;
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
      setMessage(bbqErrorMessage(error));
      setSaving(false);
    }
  }

  async function removeOrder() {
    if (!order || saving) return;
    if (!window.confirm("删除这条记录？")) return;
    setSaving(true);
    try {
      await bbqStore.deleteOrder(order.id);
      navigate(bbqHomePath(order.businessDayKey));
    } catch (error) {
      setMessage(bbqErrorMessage(error));
      setSaving(false);
    }
  }

  if (phase === "loading") {
    return (
      <div
        className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        读取记录中…
      </div>
    );
  }

  if (phase === "error" || phase === "missing") {
    return (
      <div className="mx-auto flex min-h-48 w-full max-w-xl flex-col justify-center gap-3">
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {phase === "missing" ? "没有找到这条记录" : message}
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
                  ? `修改${groupingEnabled ? "订单" : "记录"} #${order.seq}`
                  : groupingEnabled
                    ? "新建订单"
                    : "记一笔"}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order
                ? `${formatShanghaiHm(new Date(order.openedAt))} ${groupingEnabled ? "开单" : "记账"}`
                : groupingEnabled
                  ? "选择打包或座号和项目后保存订单"
                  : "这次记点什么？"}
            </p>
          </div>
        </div>
      </header>
      <fieldset
        className={`${editorWorkspaceCls} min-w-0`}
        disabled={saving}
        aria-busy={saving}
      >
        <div className="min-h-0 overflow-y-auto overscroll-y-contain scroll-py-3">
          <section className="border-b px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="order-grouping"
                  className="text-sm font-medium text-foreground"
                >
                  按座号分组
                </label>
                <Switch
                  id="order-grouping"
                  checked={groupingEnabled}
                  disabled={saving}
                  aria-label="启用分组（打包或座号）"
                  onCheckedChange={(enabled) => {
                    setGroupingEnabled(enabled);
                    if (!enabled) setSeat(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {groupingEnabled
                    ? seat === null
                      ? "当前选择打包"
                      : `当前选择 ${seat} 号座`
                    : "选填"}
                </p>
              </div>
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
                  打包
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
          <section className={editorMenuPaneCls}>
            <div className="sticky top-0 z-10 bg-card pb-2">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-medium text-foreground">
                    常用项目
                  </h2>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {availableDishes.length} 项
                </span>
              </div>
              {availableDishes.length > 0 ? (
                <div className="mt-2 shrink-0">
                  <BbqSearch
                    value={search}
                    onChange={setSearch}
                    label="搜索项目名称…"
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
                  先添几个常用项目
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  比如早餐、咖啡，或一次跑步。
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={bbqMenuPath()}>添加常用项目</Link>
                </Button>
              </div>
            ) : filteredDishes.length === 0 ? (
              <p
                className="py-8 text-center text-sm text-muted-foreground"
                role="status"
              >
                没有匹配的项目，请换个关键词
              </p>
            ) : (
              <div className="mt-2 grid min-h-0 grid-cols-2 gap-1.5 auto-rows-max content-start p-1">
                {filteredDishes.map((dish) => (
                  <Button
                    key={dish.id}
                    type="button"
                    variant="ghost"
                    className={`${touchCls} h-auto w-full justify-between rounded-lg px-2.5 py-3 text-left text-sm ${editorControlCls} hover:bg-muted/70 min-w-0 whitespace-normal ${selectedQuantities.has(dish.id) ? "bg-primary/5" : "bg-muted/40"}`}
                    aria-label={`添加 ${dish.name}，已选 ${selectedQuantities.get(dish.id) ?? 0} 件`}
                    onClick={() => addDish(dish)}
                  >
                    <span className="min-w-0">
                      <span className="block break-words">{dish.name}</span>
                      <span className="mt-0.5 block text-xs font-normal tabular-nums text-muted-foreground">
                        {formatYuan(dish.priceCents)}/{dish.unit}
                      </span>
                      {dish.caloriesKcal != null ? (
                        <span className="mt-0.5 block text-xs font-normal tabular-nums text-muted-foreground">
                          {formatCalories(
                            summarizeCalories([{ ...dish, quantity: 1 }]),
                          )}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-col items-center gap-1">
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
          </section>
          <section className={editorOrderPaneCls}>
            <div className={editorOrderBodyCls}>
              <section>
                <div className="flex items-end justify-between gap-3 sticky top-0 z-10 bg-card pb-2">
                  <div>
                    <h2 className="text-sm font-medium text-foreground">
                      这一笔
                    </h2>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {itemCount} 件
                  </span>
                </div>
                {lines.length === 0 ? (
                  <div className="mt-2 flex min-h-16 flex-row items-center justify-center gap-2 rounded-lg bg-muted/40 px-3 text-center">
                    <BbqCompanion
                      mood={groupingEnabled ? "chef" : "hello"}
                      className="block size-12 shrink-0"
                    />
                    <p className="text-xs text-muted-foreground">
                      还没有添加项目
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
                            热量 {formatCalories(summarizeCalories([line]))}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`shrink-0 ${editorControlCls} hover:bg-muted/70 size-11`}
                          aria-label={
                            line.quantity === 1
                              ? `移除 ${line.name}`
                              : `减少 ${line.name} 数量`
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
                          aria-label={`增加 ${line.name} 数量`}
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
                        附张照片
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      小票或随手拍，最多 {MAX_ORDER_PHOTOS} 张
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
                    {processingPhotos ? "处理照片中…" : "拍照"}
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
                    {processingPhotos ? "处理照片中…" : "从相册选择"}
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
                          alt={`记录留存照片 ${index + 1}`}
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
                          aria-label={`删除第 ${index + 1} 张照片`}
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
                    删除这条记录
                  </Button>
                </section>
              ) : null}
            </div>
          </section>
        </div>
        <div className={totalBarCls}>
          {message ? (
            <Alert
              className="mb-2 max-h-20 overflow-auto border-destructive/30 bg-destructive/5 p-2"
              role="alert"
            >
              <AlertDescription className="text-destructive">
                {message}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="mx-auto grid w-full max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0 flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground">
                {lines.length === 0
                  ? "选择项目后保存"
                  : `${lines.length} 项 · ${itemCount} 件`}
              </p>
              <p className="text-xl font-semibold tabular-nums tracking-tight break-all leading-tight">
                {formatYuan(total)}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground break-words">
                热量 {formatCalories(summarizeCalories(lines))}
              </p>
            </div>
            <div className="flex shrink-0 items-stretch gap-1 flex-col">
              <label className="inline-flex min-h-9 shrink-0 items-center gap-2 justify-between">
                <span className="text-right">
                  <span className="block text-xs font-medium leading-none text-foreground">
                    {done ? "已完成" : "进行中"}
                  </span>
                </span>
                <Switch
                  checked={done}
                  disabled={saving}
                  aria-label="切换记录状态"
                  onCheckedChange={setDone}
                />
              </label>
              <Button
                type="button"
                className={`px-3 ${editorControlCls} focus-visible:ring-primary-foreground/70 min-h-11 w-full`}
                disabled={saving || processingPhotos}
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
                  ? "保存中…"
                  : order
                    ? "保存修改"
                    : groupingEnabled
                      ? "保存订单"
                      : "保存记录"}
              </Button>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
