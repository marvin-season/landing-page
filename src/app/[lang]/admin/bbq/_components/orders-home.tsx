"use client";

import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import {
  Camera,
  ChartLine,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DatabaseBackup,
  Download,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Store,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/link/link";
import {
  businessDayLabel,
  formatShanghaiDate,
  formatShanghaiHm,
  readBusinessDayParam,
  shiftBusinessDayKey,
} from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan } from "@/lib/bbq/money";
import { summarizeOrdersByBusinessDay } from "@/lib/bbq/statistics";
import type { BbqBackup, Order, OrderPhoto } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { cls, touchCls } from "./bbq-layout";
import {
  bbqHomePath,
  bbqMenuPath,
  bbqNewOrderPath,
  bbqOrderPath,
} from "./bbq-paths";
import { OrdersStatistics } from "./orders-statistics";

type HomeView = "orders" | "statistics";

function statusLabel(status: Order["status"]): string {
  return status === "open" ? "进行中" : "已完成";
}

function orderTotalCls(status: Order["status"]): string {
  const tone = status === "done" ? "text-muted-foreground" : "text-foreground";
  return `text-base font-semibold tabular-nums ${tone}`;
}

const homePageShellCls = cls`
  flex flex-col gap-3
  md:h-[calc(100dvh-2rem)] md:overflow-hidden
  lg:h-[calc(100dvh-10rem)]
`;

const orderWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm
  md:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]
`;

const orderTabCls = cls`
  inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md
  px-2 text-xs font-medium transition-colors
`;

const homeViewTabCls = cls`
  inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3
  text-sm font-medium transition-colors
`;

export function OrdersHome() {
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const day = mounted
    ? readBusinessDayParam(dayParam, new Date())
    : (dayParam ?? "");

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

  async function exportBackup() {
    try {
      const backup = await bbqStore.exportBackup();
      downloadBackup(backup);
    } catch (error) {
      setMessage(bbqErrorMessage(error));
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text()) as unknown;
    } catch {
      setMessage("备份文件不正确");
      return;
    }
    if (!window.confirm("把备份按编号合并进当前记账数据？")) return;
    try {
      await bbqStore.importBackup(parsed as BbqBackup);
      setSelectedId(null);
      await reload();
      setMessage(null);
    } catch (error) {
      setMessage(bbqErrorMessage(error));
    }
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
    <div className={homePageShellCls}>
      <header className="flex shrink-0 flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="size-4 text-primary" aria-hidden="true" />
              <h1 className="text-lg font-semibold text-pretty text-foreground">
                烧烤记账
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              管理当前档期订单，并查看全部档期经营趋势
            </p>
          </div>
          {storageFailed ? null : (
            <div className="flex flex-wrap gap-1.5">
              <Button asChild>
                <Link href={bbqNewOrderPath()}>
                  <Plus className="size-4" aria-hidden="true" />
                  开单
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={bbqMenuPath()}>
                  <UtensilsCrossed className="size-4" aria-hidden="true" />
                  菜单
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    <DatabaseBackup className="size-4" aria-hidden="true" />
                    数据备份
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <span className="block">完整数据备份</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      包含全部菜单、历史订单和留存照片
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void exportBackup()}>
                    <Download className="size-4" aria-hidden="true" />
                    导出完整备份
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => importInputRef.current?.click()}
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    导入完整备份
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  input.value = "";
                  void importFile(file);
                }}
              />
            </div>
          )}
        </div>
        {storageFailed ? null : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex w-fit rounded-lg bg-muted p-0.5"
              role="tablist"
              aria-label="首页视图"
            >
              <button
                type="button"
                role="tab"
                aria-selected={homeView === "orders"}
                className={`${homeViewTabCls} ${
                  homeView === "orders"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setHomeView("orders")}
              >
                <ReceiptText className="size-4" aria-hidden="true" />
                当前档
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={homeView === "statistics"}
                className={`${homeViewTabCls} ${
                  homeView === "statistics"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setHomeView("statistics")}
              >
                <ChartLine className="size-4" aria-hidden="true" />
                经营趋势
              </button>
            </div>
            {homeView === "orders" ? (
              <div className="inline-flex w-fit items-center rounded-full border bg-card p-0.5 shadow-sm">
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                >
                  <Link
                    href={
                      day
                        ? bbqHomePath(shiftBusinessDayKey(day, -1))
                        : "/admin/bbq"
                    }
                    aria-label="上一档"
                    title="上一档"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <p className="min-w-36 px-2 text-center text-xs font-medium tabular-nums text-foreground">
                  {day ? businessDayLabel(day) : "营业日"}
                </p>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                >
                  <Link
                    href={
                      day
                        ? bbqHomePath(shiftBusinessDayKey(day, 1))
                        : "/admin/bbq"
                    }
                    aria-label="下一档"
                    title="下一档"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                汇总本机保存的全部历史订单
              </p>
            )}
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
          <dl className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
            <Metric label="全部订单" value={`${orders.length} 张`} />
            <Metric label="进行中" value={`${openOrders.length} 张`} />
            <Metric label="已完成" value={`${doneOrders.length} 张`} />
            <Metric label="已结金额" value={formatYuan(settledTotal)} />
          </dl>
          <div className={orderWorkspaceCls}>
            <section className="min-h-0 min-w-0 md:overflow-auto">
              <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-card/95 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-foreground">
                      当档订单
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      新下单的订单显示在最前面
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {visibleOrders.length} 张
                  </span>
                </div>
                <div
                  className="flex rounded-lg bg-muted p-0.5"
                  role="tablist"
                  aria-label="订单状态"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "open"}
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
                    role="tab"
                    aria-selected={statusFilter === "done"}
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
                  className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"
                  role="status"
                >
                  读取订单中…
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {statusFilter === "open" ? (
                      <Clock3 className="size-5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {statusFilter === "open"
                      ? "当前没有进行中的订单"
                      : "这一档还没有已完成订单"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusFilter === "open"
                      ? "新订单会按开单时间显示在最前面"
                      : "完成订单后会显示在这里"}
                  </p>
                  {statusFilter === "open" ? (
                    <Button asChild className="mt-4">
                      <Link href={bbqNewOrderPath()}>
                        <Plus className="size-4" aria-hidden="true" />
                        开单
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y">
                  {visibleOrders.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        className={`${touchCls} w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                          selectedId === order.id ? "bg-primary/5" : ""
                        }`}
                        onClick={() => openOrder(order.id)}
                      >
                        <OrderSummary order={order} showChevron />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <aside className="hidden min-h-0 min-w-0 border-l md:flex md:flex-col">
              {selected ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          订单 #{selected.seq}
                        </p>
                        <h2 className="mt-0.5 text-lg font-semibold text-foreground">
                          {selected.seat === null
                            ? "打包订单"
                            : `${selected.seat} 号座`}
                        </h2>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock3 className="size-4" aria-hidden="true" />
                          {formatShanghaiHm(new Date(selected.openedAt))}
                          <span aria-hidden="true">·</span>
                          {statusLabel(selected.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          订单金额
                        </p>
                        <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                          {formatYuan(selected.totalCents)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium text-foreground">
                        点单明细
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
                            <p className="truncate text-foreground">
                              {line.name}
                            </p>
                            <p className="mt-0.5 tabular-nums text-muted-foreground">
                              {formatYuan(line.priceCents)} × {line.quantity}
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
                        <ul className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                          {selected.photos.map((photo, index) => (
                            <li key={photo.id}>
                              <button
                                type="button"
                                className="relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-85"
                                aria-label={`查看第 ${index + 1} 张留存照片`}
                                onClick={() => setPreviewPhoto(photo)}
                              >
                                <Image
                                  src={photo.dataUrl}
                                  alt={`订单留存照片 ${index + 1}`}
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
                  <div className="grid grid-cols-2 gap-2 border-t p-3">
                    <Button
                      type="button"
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
                          ? "完成订单"
                          : "恢复进行中"}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={bbqOrderPath(selected.id)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        修改订单
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
                  <ReceiptText
                    className="size-8 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm text-muted-foreground">
                    从左侧选择一张订单查看明细
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      ) : statisticsLoading || allOrders === null ? (
        <div
          className="flex min-h-80 flex-1 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground shadow-sm"
          role="status"
        >
          读取全部档期数据中…
        </div>
      ) : (
        <OrdersStatistics statistics={statistics} />
      )}
      {previewPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="查看订单留存照片"
          onClick={() => setPreviewPhoto(null)}
        >
          <Image
            src={previewPhoto.dataUrl}
            alt="订单留存照片大图"
            width={1600}
            height={1600}
            unoptimized
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <Button
            type="button"
            variant="soft"
            size="icon"
            className="absolute top-4 right-4 shadow-lg"
            aria-label="关闭照片预览"
            onClick={() => setPreviewPhoto(null)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
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
}: {
  order: Order;
  showChevron?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {order.seat === null ? "打包" : `${order.seat} 号座`}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            #{order.seq}
          </span>
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
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}

function downloadBackup(backup: BbqBackup) {
  const blob = new Blob([JSON.stringify(backup)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bbq-backup-${formatShanghaiDate(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
