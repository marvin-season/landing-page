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
  Images,
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
  canCreateOrderForBusinessDay,
  formatShanghaiDate,
  formatShanghaiHm,
  readBusinessDayParam,
  shiftBusinessDayKey,
} from "@/lib/bbq/business-day";
import { formatCalories, summarizeCalories } from "@/lib/bbq/calories";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan } from "@/lib/bbq/money";
import { summarizeOrdersByBusinessDay } from "@/lib/bbq/statistics";
import type { BbqBackup, Order, OrderPhoto } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { BbqInstallButton } from "./bbq-install-button";
import { cls, touchCls } from "./bbq-layout";
import {
  bbqHomePath,
  bbqMenuPath,
  bbqNewOrderPath,
  bbqOrderPath,
} from "./bbq-paths";
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

const homePageShellCls = cls`
  flex flex-col gap-3
  md:h-[calc(100dvh-2rem)] md:overflow-hidden
  lg:h-[calc(100dvh-10rem)]
  max-md:pt-12
`;

const orderWorkspaceCls = cls`
  grid min-h-0 flex-1 gap-2 overflow-hidden rounded-xl border-0 bg-transparent
  shadow-none
  md:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)] md:gap-0 md:border
  md:bg-card md:shadow-sm
  max-md:gap-3
`;

const orderTabCls = cls`
  inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md
  px-2 text-xs font-medium transition-colors
`;

const homeViewTabCls = cls`
  inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3
  text-sm font-medium transition-colors
  max-md:min-h-7 max-md:gap-1 max-md:px-1.5 max-md:text-[11px]
  max-md:[&>svg]:size-3
  max-md:flex-1
`;

const homeActionsCls = cls`
  flex flex-wrap gap-1.5
  max-md:gap-1 max-md:w-full
  max-md:[&>:is(button,a)]:h-7
  max-md:[&>:is(button,a)]:gap-0.5
  max-md:[&>:is(button,a)]:px-2
  max-md:[&>:is(button,a)]:text-[11px]
  max-md:[&>:is(button,a)_svg]:size-3
  max-md:[&>:is(button,a)]:flex-1
  max-md:[&>:is(button,a)]:whitespace-nowrap
`;

const homePeriodCls = cls`
  inline-flex w-fit items-center rounded-full border bg-card p-0.5 shadow-sm
  max-md:w-full max-md:rounded-lg
  max-md:[&>button]:flex-1 max-md:[&>button]:min-w-0
  max-md:[&>button]:min-h-7 max-md:[&>button]:text-[11px]
  max-md:[&>[data-slot=button]]:size-7
  max-md:[&>[data-slot=button]_svg]:size-3
`;

const homeMetricsCls = cls`
  grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-5
  max-md:grid-cols-6 max-md:[&>div]:col-span-2
  max-md:[&>div:nth-child(n+4)]:col-span-3
  max-md:[&>div]:min-w-0 max-md:[&>div]:px-2 max-md:[&>div]:py-1.5
  max-md:[&_dt]:text-[11px] max-md:[&_dd]:text-sm max-md:[&_dd]:break-words
`;

export function OrdersHome() {
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const importInputRef = useRef<HTMLInputElement>(null);
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

  async function exportBackup(includePhotos = false) {
    try {
      const backup = await bbqStore.exportBackup({ includePhotos });
      downloadBackup(backup, includePhotos);
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
      <header className="flex shrink-0 flex-col gap-3 max-md:gap-1.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-md:gap-1.5 max-md:flex-col max-md:items-stretch">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="size-4 text-primary" aria-hidden="true" />
              <h1 className="text-lg font-semibold text-pretty text-foreground">
                天天记账
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              记录日常支出与订单，查看金额和饮食热量趋势
            </p>
          </div>
          {storageFailed ? null : (
            <div className={homeActionsCls}>
              {canCreateOrder ? (
                <Button asChild>
                  <Link href={bbqNewOrderPath()}>
                    <Plus className="size-4" aria-hidden="true" />
                    记账
                  </Link>
                </Button>
              ) : null}
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
                    <span className="block">全部数据备份</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      默认不包含留存照片，文件更小
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void exportBackup()}>
                    <Download className="size-4" aria-hidden="true" />
                    导出备份
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void exportBackup(true)}>
                    <Images className="size-4" aria-hidden="true" />
                    导出备份（包含照片）
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => importInputRef.current?.click()}
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    导入完整备份
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <BbqInstallButton />
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between max-md:flex-col max-md:items-stretch max-md:gap-1.5">
            <div
              className="flex w-fit rounded-lg bg-muted p-0.5 max-md:w-full"
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
                当前时段
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
                统计趋势
              </button>
            </div>
            {homeView === "orders" ? (
              <div className={homePeriodCls}>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:bg-muted/70"
                >
                  <Link
                    href={
                      day
                        ? bbqHomePath(shiftBusinessDayKey(day, -1))
                        : "/admin/bbq"
                    }
                    aria-label="上一时段"
                    title="上一时段"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <BusinessDayCalendar day={day} />
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:bg-muted/70"
                >
                  <Link
                    href={
                      day
                        ? bbqHomePath(shiftBusinessDayKey(day, 1))
                        : "/admin/bbq"
                    }
                    aria-label="下一时段"
                    title="下一时段"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                汇总本机保存的全部历史记录
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
              className="min-h-0 min-w-0 max-h-[50dvh] overflow-auto rounded-xl border bg-card shadow-sm md:max-h-none md:overflow-auto md:rounded-none md:border-0 md:bg-transparent md:shadow-none max-md:max-h-[max(16rem,38dvh)] max-md:bg-muted/40"
              aria-label="记录列表"
            >
              <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-card/95 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-foreground max-md:font-semibold">
                      <span className="md:hidden">记录列表</span>
                      <span className="hidden md:inline">本时段记录</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="md:hidden">
                        点击记录，在下方查看详情
                      </span>
                      <span className="hidden md:inline">
                        新建记录显示在最前面
                      </span>
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground max-md:rounded-md max-md:bg-muted max-md:px-2 max-md:py-1 max-md:text-xs">
                    {visibleOrders.length} 条
                  </span>
                </div>
                <div
                  className="flex rounded-lg bg-muted p-0.5"
                  role="tablist"
                  aria-label="记录状态"
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
                  读取记录中…
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
                <ul className="divide-y max-md:divide-y-0 max-md:space-y-1.5 max-md:p-2">
                  {visibleOrders.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        className={`${touchCls} w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60 max-md:rounded-lg max-md:border max-md:focus-visible:outline-none max-md:focus-visible:ring-1 max-md:focus-visible:ring-inset max-md:focus-visible:ring-primary/50 ${
                          selectedId === order.id
                            ? "bg-primary/5 max-md:border-primary/35 max-md:bg-primary/10 max-md:hover:bg-primary/10"
                            : "max-md:border-transparent max-md:bg-card max-md:hover:bg-muted/70"
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
              className={`min-h-0 min-w-0 flex-col rounded-xl border bg-card shadow-sm md:rounded-none md:border-0 md:border-l md:bg-transparent md:shadow-none max-md:overflow-hidden max-md:border-primary/25 ${
                selected ? "flex" : "hidden md:flex"
              }`}
            >
              {selected ? (
                <div className="flex min-h-0 flex-col md:h-full">
                  <div className="flex items-center justify-between gap-2 border-b border-primary/15 bg-primary/5 px-3 py-2 md:hidden">
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
                  <div className="border-b p-3 md:p-4 max-md:bg-muted/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground max-md:hidden">
                          记录 #{selected.seq}
                        </p>
                        <h2 className="mt-0.5 text-lg font-semibold text-foreground max-md:mt-0 max-md:text-xl">
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
                          <span className="max-md:rounded-md max-md:bg-primary/10 max-md:px-1.5 max-md:py-0.5 max-md:font-medium max-md:text-primary">
                            {statusLabel(selected.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          记录金额
                        </p>
                        <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground max-md:text-2xl max-md:tracking-tight">
                          {formatYuan(selected.totalCents)}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          热量{" "}
                          {formatCalories(summarizeCalories(selected.lines))}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 p-3 md:overflow-auto md:p-4">
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
                            <p className="truncate text-foreground max-md:font-medium">
                              {line.name}
                            </p>
                            <p className="mt-0.5 tabular-nums text-muted-foreground max-md:text-xs">
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
                  <div className="grid grid-cols-2 gap-2 border-t p-2 md:p-3 max-md:bg-muted/30">
                    <Button
                      type="button"
                      className="max-md:rounded-lg max-md:px-3 max-md:shadow-none max-md:focus-visible:ring-1 max-md:focus-visible:ring-inset max-md:focus-visible:ring-primary-foreground/70 max-md:focus-visible:ring-offset-0"
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
                      className="max-md:rounded-lg max-md:px-3 max-md:shadow-none max-md:hover:shadow-none max-md:focus-visible:ring-1 max-md:focus-visible:ring-inset max-md:focus-visible:ring-primary/50 max-md:focus-visible:ring-offset-0"
                    >
                      <Link href={bbqOrderPath(selected.id)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        修改记录
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
                    从左侧选择一条记录查看明细
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
          读取全部时段数据中…
        </div>
      ) : (
        <OrdersStatistics statistics={statistics} />
      )}
      {previewPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="查看记录留存照片"
          onClick={() => setPreviewPhoto(null)}
        >
          <Image
            src={previewPhoto.dataUrl}
            alt="记录留存照片大图"
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
            <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground md:hidden">
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
            className={`size-4 text-muted-foreground ${isSelected ? "max-md:rotate-90 max-md:text-primary" : ""}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}

function downloadBackup(backup: BbqBackup, includePhotos: boolean) {
  const blob = new Blob([JSON.stringify(backup)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const suffix = includePhotos ? "-with-photos" : "";
  link.download = `daily-ledger-backup${suffix}-${formatShanghaiDate(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
