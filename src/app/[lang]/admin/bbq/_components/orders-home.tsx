"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Camera,
  ChartLine,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Store,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/link/link";
import {
  businessDayLabel,
  canCreateOrderForBusinessDay,
  formatShanghaiHm,
  readBusinessDayParam,
} from "@/lib/bbq/business-day";
import { formatCalories, summarizeCalories } from "@/lib/bbq/calories";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan } from "@/lib/bbq/money";
import { summarizeOrdersByBusinessDay } from "@/lib/bbq/statistics";
import type { Order, OrderPhoto } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { cls, pageShellCls, touchCls } from "./bbq-layout";
import { bbqNewOrderPath, bbqOrderPath } from "./bbq-paths";
import { BusinessDayCalendar } from "./business-day-calendar";
import { OrdersStatistics } from "./orders-statistics";

type HomeView = "orders" | "statistics";

function statusLabel(status: Order["status"]): string {
  return status === "open" ? "进行中" : "已完成";
}

function orderTotalCls(status: Order["status"]): string {
  const tone = status === "done" ? "text-muted-foreground" : "text-foreground";
  return `text-base font-semibold tabular-nums ${tone}`;
}

const orderWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden rounded-xl border-0 bg-transparent shadow-none gap-3
`;

const orderTabCls = cls`
  inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs
  font-medium transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-inset focus-visible:ring-primary/50
`;

const homeViewTabCls = cls`
  inline-flex items-center justify-center rounded-md font-medium transition-colors
  min-h-10 gap-1.5 px-2 text-xs [&>svg]:size-3.5 flex-1 focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50
  min-w-0 basis-0
`;

const homeMetricsCls = cls`
  grid shrink-0 gap-px overflow-hidden rounded-xl border bg-border grid-cols-6
  [&>div]:col-span-2 [&>div:nth-child(n+4)]:col-span-3 [&>div]:min-w-0 [&>div]:px-2
  [&>div]:py-1.5 [&_dt]:text-[11px] [&_dd]:text-sm [&_dd]:break-words
`;

export function OrdersHome() {
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [homeView, setHomeView] = useState<HomeView>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[] | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order["status"]>("open");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<OrderPhoto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const [readyDay, setReadyDay] = useState<string | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const day = mounted
    ? readBusinessDayParam(dayParam, new Date())
    : (dayParam ?? "");
  const canCreateOrder =
    currentTime !== null && canCreateOrderForBusinessDay(currentTime, day);

  useEffect(() => {
    if (!mounted || !day) return;
    let cancelled = false;
    void bbqStore
      .listOrders(day)
      .then((next) => {
        if (cancelled) return;
        setOrders(next);
        setReadyDay(day);
        setStorageFailed(false);
        setMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStorageFailed(true);
        setMessage(bbqErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [day, mounted]);

  useEffect(() => {
    if (homeView !== "statistics" || allOrders !== null) {
      return;
    }
    let cancelled = false;
    setStatisticsLoading(true);
    void bbqStore
      .listAllOrders()
      .then((next) => {
        if (cancelled) return;
        setAllOrders(next);
        setMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStorageFailed(true);
        setMessage(bbqErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setStatisticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allOrders, homeView]);

  async function reload() {
    const [next, nextAll] = await Promise.all([
      bbqStore.listOrders(day),
      allOrders === null ? Promise.resolve(null) : bbqStore.listAllOrders(),
    ]);
    setOrders(next);
    if (nextAll) setAllOrders(nextAll);
  }

  function openOrder(id: string) {
    setSelectedId(id);
  }

  async function toggleOrderStatus(order: Order) {
    if (updatingStatusId) return;
    setUpdatingStatusId(order.id);
    setMessage(null);
    try {
      await bbqStore.saveOrder({
        id: order.id,
        seat: order.seat,
        status: order.status === "open" ? "done" : "open",
        lines: order.lines.map((line) => ({
          id: line.id,
          dishId: line.dishId,
          name: line.name,
          priceCents: line.priceCents,
          unit: line.unit,
          quantity: line.quantity,
        })),
      });
      await reload();
    } catch (error) {
      setMessage(bbqErrorMessage(error));
    } finally {
      setUpdatingStatusId(null);
    }
  }

  const openOrders = orders.filter((order) => order.status === "open");
  const doneOrders = orders.filter((order) => order.status === "done");
  const visibleOrders = statusFilter === "open" ? openOrders : doneOrders;
  const selected =
    visibleOrders.find((order) => order.id === selectedId) ?? null;
  const settledTotal = doneOrders.reduce(
    (total, order) => total + order.totalCents,
    0,
  );
  const statistics = summarizeOrdersByBusinessDay(allOrders ?? []);

  useEffect(() => {
    setSelectedId((current) => {
      const nextOrders = orders.filter(
        (order) => order.status === statusFilter,
      );
      if (current && nextOrders.some((order) => order.id === current)) {
        return current;
      }
      return nextOrders[0]?.id ?? null;
    });
    setPreviewPhoto(null);
  }, [orders, statusFilter]);

  return (
    <div className={pageShellCls}>
      <header className="flex shrink-0 flex-col gap-1.5">
        <div className="flex gap-1.5 flex-col items-stretch">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="size-4 text-primary" aria-hidden="true" />
              <h1 className="text-lg font-semibold text-pretty text-foreground pr-24">
                天天记账
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              记录日常支出与订单，查看金额和饮食热量趋势
            </p>
          </div>
        </div>
        {storageFailed ? null : (
          <div className="flex flex-col items-stretch gap-1.5">
            <div
              className="flex rounded-lg bg-muted p-0.5 w-full"
              role="group"
              aria-label="首页视图"
            >
              <BusinessDayCalendar day={day}>
                <button
                  type="button"
                  disabled={!day}
                  aria-pressed={homeView === "orders"}
                  aria-label={`${day ? businessDayLabel(day) : "当前时段"}，${homeView === "orders" ? "打开日历" : "查看记录"}`}
                  className={`${homeViewTabCls} ${
                    homeView === "orders"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={(event) => {
                    if (homeView !== "orders") {
                      // 从统计返回时先切换视图；再次点击当前时段才打开日历。
                      event.preventDefault();
                      setHomeView("orders");
                    }
                  }}
                >
                  <span className="shrink-0">当前时段</span>
                  {day ? (
                    <span
                      className="truncate text-[11px] font-normal tabular-nums text-muted-foreground"
                      title={businessDayLabel(day)}
                    >
                      {day.slice(5, 10)}
                      {day.endsWith("#off") ? " 休息" : ""}
                    </span>
                  ) : null}
                  <ChevronDown
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              </BusinessDayCalendar>
              <button
                type="button"
                aria-pressed={homeView === "statistics"}
                className={`${homeViewTabCls} ${
                  homeView === "statistics"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setHomeView("statistics")}
              >
                <ChartLine className="size-4" aria-hidden="true" />
                统计趋势
              </button>
            </div>
            {homeView === "statistics" ? (
              <p className="text-xs text-muted-foreground">
                汇总本机保存的全部历史记录
              </p>
            ) : null}
          </div>
        )}
        {message ? (
          <Alert className="border-destructive/30 bg-destructive/5 p-3">
            <AlertDescription className="text-destructive">
              {message}
            </AlertDescription>
          </Alert>
        ) : null}
      </header>
      {storageFailed ? null : homeView === "orders" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <dl className={homeMetricsCls}>
            <Metric label="全部记录" value={`${orders.length} 条`} />
            <Metric label="进行中" value={`${openOrders.length} 条`} />
            <Metric label="已完成" value={`${doneOrders.length} 条`} />
            <Metric label="已完成金额" value={formatYuan(settledTotal)} />
            <Metric
              label="已完成热量"
              value={formatCalories(
                summarizeCalories(doneOrders.flatMap((order) => order.lines)),
              )}
            />
          </dl>
          <div className={orderWorkspaceCls}>
            <section
              className="min-h-96 min-w-0 overflow-hidden rounded-xl border shadow-sm bg-muted/40 flex flex-col"
              aria-label="记录列表"
            >
              <div className="flex flex-col gap-2 border-b bg-card/95 px-3 py-2.5 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm text-foreground font-semibold">
                      记录列表
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      点击记录，在下方查看详情
                    </p>
                  </div>
                  <span className="tabular-nums text-muted-foreground rounded-md bg-muted px-2 py-1 text-xs">
                    {visibleOrders.length} 条
                  </span>
                </div>
                <div
                  className="flex rounded-lg bg-muted p-0.5"
                  role="group"
                  aria-label="记录状态"
                >
                  <button
                    type="button"
                    aria-pressed={statusFilter === "open"}
                    className={`${orderTabCls} ${
                      statusFilter === "open"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setStatusFilter("open")}
                  >
                    <Clock3 className="size-4" aria-hidden="true" />
                    进行中
                    <span className="tabular-nums">{openOrders.length}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={statusFilter === "done"}
                    className={`${orderTabCls} ${
                      statusFilter === "done"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setStatusFilter("done")}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    已完成
                    <span className="tabular-nums">{doneOrders.length}</span>
                  </button>
                </div>
              </div>
              {readyDay !== day ? (
                <div
                  className="flex min-h-56 items-center justify-center text-sm text-muted-foreground flex-1"
                  role="status"
                >
                  读取记录中…
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center flex-1 py-6">
                  <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {statusFilter === "open" ? (
                      <Clock3 className="size-5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {statusFilter === "open"
                      ? "当前没有进行中的记录"
                      : "这一时段还没有已完成记录"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusFilter === "open"
                      ? "新记录会按记账时间显示在最前面"
                      : "完成记录后会显示在这里"}
                  </p>
                  {statusFilter === "open" && canCreateOrder ? (
                    <Button asChild className="mt-4">
                      <Link href={bbqNewOrderPath()}>
                        <Plus className="size-4" aria-hidden="true" />
                        记账
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y-0 space-y-1.5 p-2 max-h-[max(20rem,60dvh)] overflow-y-auto overscroll-y-contain">
                  {visibleOrders.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        className={`${touchCls} w-full px-3 py-2.5 text-left transition-colors rounded-lg border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 ${
                          selectedId === order.id
                            ? "border-primary/35 bg-primary/10 hover:bg-primary/10"
                            : "border-transparent bg-card hover:bg-muted/70"
                        }`}
                        aria-pressed={selectedId === order.id}
                        aria-controls="bbq-order-detail"
                        onClick={() => openOrder(order.id)}
                      >
                        <OrderSummary
                          order={order}
                          showChevron
                          isSelected={selectedId === order.id}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <aside
              id="bbq-order-detail"
              aria-label="记录详情"
              className={`min-h-0 min-w-0 flex-col rounded-xl border bg-card shadow-sm overflow-hidden border-primary/25 ${
                selected ? "flex" : "hidden"
              }`}
            >
              {selected ? (
                <div className="flex min-h-0 flex-col">
                  <div className="flex items-center justify-between gap-2 border-b border-primary/15 bg-primary/5 px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <ReceiptText
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      记录详情
                    </span>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      记录 #{selected.seq}
                    </span>
                  </div>
                  <div className="border-b p-3 bg-muted/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold text-foreground mt-0 text-xl">
                          {selected.groupingEnabled === false
                            ? "日常记账"
                            : selected.seat === null
                              ? "打包订单"
                              : `${selected.seat} 号座`}
                        </h2>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock3 className="size-4" aria-hidden="true" />
                          {formatShanghaiHm(new Date(selected.openedAt))}
                          <span aria-hidden="true">·</span>
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                            {statusLabel(selected.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          记录金额
                        </p>
                        <p className="mt-0.5 font-semibold tabular-nums text-foreground text-2xl tracking-tight">
                          {formatYuan(selected.totalCents)}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          热量{" "}
                          {formatCalories(summarizeCalories(selected.lines))}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium text-foreground">
                        记录明细
                      </h3>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {selected.lines.length} 项
                      </span>
                    </div>
                    <ul className="mt-2 divide-y text-sm">
                      {selected.lines.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-center justify-between gap-4 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-foreground font-medium">
                              {line.name}
                            </p>
                            <p className="mt-0.5 tabular-nums text-muted-foreground text-xs">
                              {formatYuan(line.priceCents)} × {line.quantity}
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                              热量 {formatCalories(summarizeCalories([line]))}
                            </p>
                          </div>
                          <span className="shrink-0 font-medium tabular-nums text-foreground">
                            {formatYuan(line.lineCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {selected.photos.length > 0 ? (
                      <section className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <Camera
                              className="size-4 text-primary"
                              aria-hidden="true"
                            />
                            <h3 className="text-sm font-medium text-foreground">
                              留存照片
                            </h3>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {selected.photos.length} 张
                          </span>
                        </div>
                        <ul className="mt-2 grid grid-cols-3 gap-2">
                          {selected.photos.map((photo, index) => (
                            <li key={photo.id}>
                              <button
                                type="button"
                                className="relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-85"
                                aria-label={`查看第 ${index + 1} 张留存照片`}
                                onClick={(event) => {
                                  photoTriggerRef.current = event.currentTarget;
                                  setPreviewPhoto(photo);
                                }}
                              >
                                <Image
                                  src={photo.dataUrl}
                                  alt={`记录留存照片 ${index + 1}`}
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
                  <div className="grid grid-cols-2 gap-2 border-t p-2 bg-muted/30">
                    <Button
                      type="button"
                      className="rounded-lg px-3 shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-foreground/70 focus-visible:ring-offset-0"
                      disabled={updatingStatusId !== null}
                      onClick={() => void toggleOrderStatus(selected)}
                    >
                      {selected.status === "open" ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="size-4" aria-hidden="true" />
                      )}
                      {updatingStatusId === selected.id
                        ? "处理中…"
                        : selected.status === "open"
                          ? "完成记录"
                          : "恢复进行中"}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-lg px-3 shadow-none hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                    >
                      <Link href={bbqOrderPath(selected.id)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        修改记录
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      ) : statisticsLoading || allOrders === null ? (
        <div
          className="flex min-h-80 flex-1 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground shadow-sm"
          role="status"
        >
          读取全部时段数据中…
        </div>
      ) : (
        <OrdersStatistics
          statistics={statistics}
          onSelectDay={() => setHomeView("orders")}
        />
      )}
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
              记录留存照片
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              记录的照片大图，可按 Esc 或关闭按钮返回记录详情
            </Dialog.Description>
            {previewPhoto ? (
              <Image
                src={previewPhoto.dataUrl}
                alt="记录留存照片大图"
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
                aria-label="关闭照片预览"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function OrderSummary({
  order,
  showChevron = false,
  isSelected = false,
}: {
  order: Order;
  showChevron?: boolean;
  isSelected?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {order.groupingEnabled === false
              ? "日常记账"
              : order.seat === null
                ? "打包"
                : `${order.seat} 号座`}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            #{order.seq}
          </span>
          {isSelected ? (
            <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              查看中
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {order.status === "open" ? (
              <Clock3 className="size-3.5 text-primary" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            )}
            {statusLabel(order.status)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {formatShanghaiHm(new Date(order.openedAt))}
          </span>
          <span aria-hidden="true">·</span>
          <span>{order.lines.length} 项</span>
          {order.photos.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Camera className="size-3.5" aria-hidden="true" />
                {order.photos.length}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className={orderTotalCls(order.status)}>
          {formatYuan(order.totalCents)}
        </p>
        {showChevron ? (
          <ChevronRight
            className={`size-4 ${isSelected ? "rotate-90 text-primary" : "text-muted-foreground"}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
