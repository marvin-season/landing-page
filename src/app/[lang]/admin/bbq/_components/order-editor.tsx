"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Switch,
} from "@landing-page/design-system";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/components/link/link";
import { formatShanghaiHm } from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan, lineCents, totalCents } from "@/lib/bbq/money";
import { createOrderPhoto, MAX_ORDER_PHOTOS } from "@/lib/bbq/order-photo";
import type { Dish, Order, OrderPhoto, OrderStatus } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { cls, pageShellCls, totalBarCls, touchCls } from "./bbq-layout";
import { BBQ_MENU_CHANGED_EVENT } from "./bbq-menu-events";
import { bbqHomePath, bbqMenuPath } from "./bbq-paths";
import { useBbqNavigate } from "./use-bbq-nav";

const SEATS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const editorWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm
  md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]
  md:grid-rows-[auto_minmax(0,1fr)]
`;

const editorMenuPaneCls = cls`
  min-h-0 min-w-0 border-b p-3
  md:overflow-auto md:border-b-0 md:border-r
  flex flex-col
`;

const editorOrderPaneCls = cls`
  flex min-h-0 min-w-0 flex-col
  md:h-full
`;

const editorOrderBodyCls = cls`
  min-h-0 p-3
  md:flex-1 md:overflow-auto
`;

const editorControlCls = cls`
  rounded-lg shadow-none transition-colors
  hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 focus-visible:ring-offset-0
  shinchan:rounded-lg
`;

const photoActionCls = cls`
  inline-flex h-8 cursor-pointer items-center justify-center gap-1.5
  rounded-lg border bg-card px-2.5 text-xs font-medium text-foreground
  transition-colors hover:bg-muted/70 has-disabled:pointer-events-none
  has-disabled:opacity-50 has-focus-visible:ring-1
  has-focus-visible:ring-inset has-focus-visible:ring-primary/50
`;

type DraftLine = {
  key: string;
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nextDishes = await readMenu();
        const existing = orderId ? await bbqStore.getOrder(orderId) : null;
        if (cancelled) return;
        if (orderId && !existing) {
          setPhase("missing");
          return;
        }
        setDishes(nextDishes);
        if (existing) {
          setOrder(existing);
          setSeat(existing.seat);
          setDone(existing.status === "done");
          setPhotos(existing.photos);
          setLines(
            existing.lines.map((line) => ({
              key: line.id,
              id: line.id,
              dishId: line.dishId,
              name: line.name,
              priceCents: line.priceCents,
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
        .then((nextDishes) => {
          if (cancelled) return;
          setDishes(nextDishes);
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
      setMessage(`每张订单最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
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
        setMessage(`每张订单最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
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
        seat,
        status,
        photos,
        lines: lines.map((line) => ({
          id: line.id,
          dishId: line.dishId,
          name: line.name,
          priceCents: line.priceCents,
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
    if (!window.confirm("删除这张订单？")) return;
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
        读取订单中…
      </div>
    );
  }

  if (phase === "error" || phase === "missing") {
    return (
      <div className="mx-auto flex min-h-48 w-full max-w-xl flex-col justify-center gap-3">
        <Link
          href="/admin/bbq"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回订单
        </Link>
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {phase === "missing" ? "没有找到这张订单" : message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      className={`${pageShellCls} pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0`}
    >
      <header className="flex shrink-0 flex-col gap-2">
        <Link
          href={order ? bbqHomePath(order.businessDayKey) : "/admin/bbq"}
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回订单
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <ReceiptText className="size-4 text-primary" aria-hidden="true" />
              <h1 className="text-lg font-semibold text-foreground">
                {order ? `修改订单 #${order.seq}` : "新建订单"}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order
                ? `${formatShanghaiHm(new Date(order.openedAt))} 开单`
                : "选择座号和菜品后保存订单"}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={bbqMenuPath()}>
              <UtensilsCrossed className="size-4" aria-hidden="true" />
              管理菜单
            </Link>
          </Button>
        </div>
      </header>
      <div className={editorWorkspaceCls}>
        <section className="border-b px-3 py-2.5 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-foreground">用餐方式</h2>
              <p className="text-xs text-muted-foreground">
                {seat === null ? "当前选择打包" : `当前选择 ${seat} 号座`}
              </p>
            </div>
            <label className="inline-flex shrink-0 items-center gap-1.5">
              <span className="text-right">
                <span className="block text-xs font-medium leading-none text-foreground">
                  {done ? "已完成" : "进行中"}
                </span>
              </span>
              <Switch
                checked={done}
                disabled={saving}
                aria-label="切换订单状态"
                onCheckedChange={setDone}
              />
            </label>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-9">
            <Button
              type="button"
              variant={seat === null ? "default" : "outline"}
              aria-pressed={seat === null}
              className={`${touchCls} col-span-2 min-w-0 text-sm ${editorControlCls} px-2 sm:col-span-1 ${seat === null ? "focus-visible:ring-primary-foreground/70" : "hover:bg-muted/70"}`}
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
        </section>
        <section className={editorMenuPaneCls}>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-foreground">选择菜品</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                点击菜品即可加入订单
              </p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {availableDishes.length} 项
            </span>
          </div>
          {availableDishes.length === 0 ? (
            <div className="mt-3 flex min-h-36 flex-col items-center justify-center rounded-lg bg-muted/40 px-4 text-center">
              <UtensilsCrossed
                className="size-7 text-muted-foreground/60"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-foreground">
                还没有上架菜品
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                先到菜单中新增并上架菜品
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={bbqMenuPath()}>管理菜单</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-2 grid min-h-0 grid-cols-2 gap-1.5 overflow-y-auto max-h-[40dvh] md:max-h-none">
              {availableDishes.map((dish) => (
                <Button
                  key={dish.id}
                  type="button"
                  variant="outline"
                  className={`${touchCls} h-auto w-full justify-between rounded-lg px-2.5 py-2 text-left text-sm ${editorControlCls} hover:bg-muted/70`}
                  onClick={() => addDish(dish)}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{dish.name}</span>
                    <span className="mt-0.5 block text-xs font-normal tabular-nums text-muted-foreground">
                      {formatYuan(dish.priceCents)}/{dish.unit}
                    </span>
                  </span>
                  <Plus className="size-4 shrink-0" aria-hidden="true" />
                </Button>
              ))}
            </div>
          )}
        </section>
        <section className={editorOrderPaneCls}>
          <div className={editorOrderBodyCls}>
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-foreground">
                    订单明细
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    调整数量，减至零会移除菜品
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {itemCount} 份
                </span>
              </div>
              {lines.length === 0 ? (
                <div className="mt-2 flex min-h-16 flex-row items-center justify-center gap-2 rounded-lg bg-muted/40 px-3 text-center">
                  <ReceiptText
                    className="size-5 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-muted-foreground">
                    还没有添加菜品
                  </p>
                </div>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {lines.map((line) => (
                    <li
                      key={line.key}
                      className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-2"
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
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={`size-8 shrink-0 ${editorControlCls} hover:bg-muted/70`}
                        aria-label={`减少 ${line.name} 数量`}
                        onClick={() => changeQuantity(line.key, -1)}
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </Button>
                      <span className="min-w-6 text-center text-sm font-medium tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={`size-8 shrink-0 ${editorControlCls} hover:bg-muted/70`}
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
                      拍照留存
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    选填，最多 {MAX_ORDER_PHOTOS} 张
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {photos.length}/{MAX_ORDER_PHOTOS}
                </span>
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
                <ul className="mt-2 grid grid-cols-4 gap-1.5">
                  {photos.map((photo, index) => (
                    <li
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      <Image
                        src={photo.dataUrl}
                        alt={`订单留存照片 ${index + 1}`}
                        fill
                        sizes="(max-width: 767px) 25vw, 7rem"
                        unoptimized
                        className="size-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="soft"
                        size="icon"
                        className="absolute top-1 right-1 size-7 shadow-sm"
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
                  删除这张订单
                </Button>
              </section>
            ) : null}
            {message ? (
              <Alert className="mt-3 border-destructive/30 bg-destructive/5 p-3">
                <AlertDescription className="text-destructive">
                  {message}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <TotalBar>
            <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {itemCount} 份 · 订单总额
                </p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatYuan(total)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  className={`px-3 ${editorControlCls} focus-visible:ring-primary-foreground/70`}
                  disabled={saving || processingPhotos}
                  onClick={() => void save()}
                >
                  {done ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {saving ? "保存中…" : order ? "保存修改" : "保存订单"}
                </Button>
              </div>
            </div>
          </TotalBar>
        </section>
      </div>
    </div>
  );
}

function TotalBar({ children }: { children: ReactNode }) {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const bar = <div className={totalBarCls}>{children}</div>;
  if (narrow) return createPortal(bar, document.body);
  return bar;
}
