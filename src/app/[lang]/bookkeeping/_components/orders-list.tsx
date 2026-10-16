"use client";

import { Button } from "@landing-page/design-system";
import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Camera, ChevronRight, Plus } from "lucide-react";
import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { formatShanghaiHm } from "@/lib/bbq/business-day";
import { summarizeCalories } from "@/lib/bbq/calories";
import { formatYuan } from "@/lib/bbq/money";
import type { Order } from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { formatCalories } from "./bbq-i18n";
import { cls, touchCls } from "./bbq-layout";
import { BbqLink as Link } from "./bbq-link";
import { bbqNewOrderPath } from "./bbq-paths";
import { OrderDetail } from "./order-detail";

function statusLabel(i18n: I18n, status: Order["status"]): string {
  return status === "open" ? i18n._(msg`进行中`) : i18n._(msg`已完成`);
}

function orderTotalCls(status: Order["status"]): string {
  const tone = status === "done" ? "text-muted-foreground" : "text-foreground";
  return cls`text-base font-semibold tabular-nums ${tone} break-all sm:text-lg`;
}

const orderTabCls = cls`
  inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs
  font-medium transition-colors min-h-10 focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-inset focus-visible:ring-primary/50
  duration-150 active:bg-primary/10 touch-manipulation motion-reduce:transition-none
`;

export function OrdersList({
  orders,
  loading,
  canCreateOrder,
  updatingStatusId,
  onToggleStatus,
  selectedId,
  statusFilter,
  onSelect,
  onFilterChange,
}: {
  selectedId: string | null;
  statusFilter: Order["status"];
  onSelect: (id: string | null) => void;
  onFilterChange: (status: Order["status"]) => void;
  orders: Order[];
  loading: boolean;
  canCreateOrder: boolean;
  updatingStatusId: string | null;
  onToggleStatus: (order: Order) => Promise<void>;
}) {
  const { i18n, t } = useLingui();
  const viewportRef = useRef<HTMLDivElement>(null);
  const openOrders = orders.filter((order) => order.status === "open");
  const doneOrders = orders.filter((order) => order.status === "done");
  const settledTotal = doneOrders.reduce(
    (total, order) => total + order.totalCents,
    0,
  );
  const settledCalories = summarizeCalories(
    doneOrders.flatMap((order) => order.lines),
  );
  const visibleOrders = statusFilter === "open" ? openOrders : doneOrders;
  const selected =
    visibleOrders.find((order) => order.id === selectedId) ?? null;

  function changeFilter(status: Order["status"]) {
    if (status === statusFilter) return;
    onSelect(null);
    onFilterChange(status);
  }

  return (
    <section
      className="min-h-0 min-w-0 overflow-hidden rounded-2xl bg-card flex flex-col flex-1 border border-border/60"
      aria-label={t`记录列表`}
    >
      <div className="flex flex-col gap-2.5 border-b bg-card px-3 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-xs text-muted-foreground whitespace-nowrap">
              <Trans>已完成合计</Trans>
            </h2>
            <p className="text-2xl font-semibold tabular-nums tracking-tight break-all">
              {loading ? "—" : formatYuan(settledTotal)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums col-span-2">
              <Trans>
                热量 {loading ? "—" : formatCalories(i18n, settledCalories)}
              </Trans>
            </p>
          </div>
          {!loading && visibleOrders.length > 0 ? (
            <BbqCompanion mood="dance" className="block size-12 shrink-0" />
          ) : null}
        </div>
        <div
          className="grid gap-1 grid-cols-2 rounded-xl bg-muted/60 p-1"
          role="group"
          aria-label={t`记录状态`}
        >
          <button
            type="button"
            aria-pressed={statusFilter === "open"}
            className={`${orderTabCls} ${
              statusFilter === "open"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => changeFilter("open")}
          >
            <Trans>进行中</Trans>
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === "done"}
            className={`${orderTabCls} ${
              statusFilter === "done"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => changeFilter("done")}
          >
            <Trans>已完成</Trans>
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`min-h-0 flex flex-1 flex-col [scrollbar-gutter:stable] ${selected ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"}`}
      >
        {loading ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground flex-1 py-6"
            role="status"
          >
            <Trans>读取记录中…</Trans>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 text-center flex-1 py-6">
            <BbqCompanion mood="hello" className="block size-28 shrink-0" />
            <p className="mt-3 text-sm font-medium text-foreground">
              {statusFilter === "open"
                ? t`还没有进行中的记录`
                : t`还没有完成的记录`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "open"
                ? t`一顿饭、一杯咖啡，都可以记在这里。`
                : t`把记录标为完成，就会计入上面的合计。`}
            </p>
            {statusFilter === "open" && canCreateOrder ? (
              <Button asChild className="mt-4">
                <Link href={bbqNewOrderPath()}>
                  <Plus className="size-4" aria-hidden="true" />
                  <Trans>记一笔</Trans>
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="p-2 flex-1 flex flex-col gap-2">
            {visibleOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                expanded={selected?.id === order.id}
                hidden={selected !== null && selected.id !== order.id}
                viewportRef={viewportRef}
                updatingStatusId={updatingStatusId}
                onToggleStatus={onToggleStatus}
                onToggle={() =>
                  onSelect(selectedId === order.id ? null : order.id)
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// 外层 li 始终保留摘要高度；只移动内部卡片，避免改变其他记录的位置和 scrollTop。
function OrderListItem({
  order,
  expanded,
  hidden,
  viewportRef,
  updatingStatusId,
  onToggleStatus,
  onToggle,
}: {
  order: Order;
  expanded: boolean;
  hidden: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  updatingStatusId: string | null;
  onToggleStatus: (order: Order) => Promise<void>;
  onToggle: () => void;
}) {
  const { t } = useLingui();
  const rowRef = useRef<HTMLLIElement>(null);
  const summaryRef = useRef<HTMLButtonElement>(null);
  const [geometry, setGeometry] = useState({
    rowHeight: 0,
    height: 0,
    offset: 0,
  });
  const [showDetail, setShowDetail] = useState(expanded);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const summary = summaryRef.current;
    const viewport = viewportRef.current;
    if (!row || !summary || !viewport) return;
    const measure = () => {
      const rowHeight = summary.offsetHeight + 2;
      const height = Math.max(rowHeight, viewport.clientHeight - 16);
      const offset = expanded
        ? viewport.getBoundingClientRect().top +
          8 -
          row.getBoundingClientRect().top
        : 0;
      setGeometry((current) =>
        current.rowHeight === rowHeight &&
        current.height === height &&
        current.offset === offset
          ? current
          : { rowHeight, height, offset },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(summary);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [expanded, viewportRef]);

  useLayoutEffect(() => {
    if (expanded) {
      setShowDetail(true);
      return;
    }
    // 收起动画结束后再释放详情；记录摘要及占位始终常驻。
    const timer = window.setTimeout(() => setShowDetail(false), 280);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  const variables = {
    "--row-height": geometry.rowHeight ? `${geometry.rowHeight}px` : "auto",
    "--detail-height": `${geometry.height}px`,
    "--row-offset": `${geometry.offset}px`,
  } as CSSProperties;

  return (
    <li
      ref={rowRef}
      style={variables}
      inert={hidden}
      aria-hidden={hidden || undefined}
      className={`relative h-[var(--row-height)] transition-opacity duration-200 motion-reduce:transition-none ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"} ${expanded || showDetail ? "z-10" : "z-0"} shrink-0`}
    >
      <div
        className={`overflow-hidden rounded-lg border bg-card min-h-0 flex flex-col transition-[transform,height,border-color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${expanded ? "h-[var(--detail-height)] [transform:translateY(var(--row-offset))] border-primary/35" : "h-[var(--row-height)] transform-none border-border/60"}`}
      >
        <button
          ref={summaryRef}
          type="button"
          className={`${touchCls} w-full px-3 py-3 text-left transition-colors rounded-lg border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 duration-150 active:bg-primary/15 touch-manipulation motion-reduce:transition-none shrink-0 ${expanded ? "rounded-b-none border-transparent bg-primary/5 hover:bg-primary/5" : "border-transparent bg-card hover:bg-muted/70"}`}
          aria-expanded={expanded}
          aria-controls={
            showDetail ? `bbq-order-detail-${order.id}` : undefined
          }
          onClick={onToggle}
        >
          <OrderSummary order={order} showChevron isSelected={expanded} />
        </button>
        {showDetail ? (
          <div
            id={`bbq-order-detail-${order.id}`}
            role="region"
            aria-label={t`记录 #${order.seq} 详情`}
            inert={!expanded}
            aria-hidden={!expanded || undefined}
            className={`overflow-hidden min-h-0 flex flex-1 flex-col transition-opacity duration-200 motion-reduce:transition-none ${expanded ? "opacity-100" : "opacity-0"}`}
          >
            <div className="border-t border-primary/15 min-h-0 flex flex-1 flex-col">
              <OrderDetail
                order={order}
                updatingStatusId={updatingStatusId}
                onToggleStatus={onToggleStatus}
              />
            </div>
          </div>
        ) : null}
      </div>
    </li>
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
  const { i18n, t } = useLingui();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {order.groupingEnabled !== false && order.groupName
              ? order.groupName
              : order.groupingEnabled === false || order.groupName === null
                ? new Intl.ListFormat(
                    i18n.locale === "pseudo" ? "en" : i18n.locale,
                    { style: "short", type: "unit" },
                  ).format(order.lines.map((line) => line.name)) || t`日常记账`
                : order.seat === null
                  ? t`打包`
                  : t`${order.seat} 号座`}
          </p>
          {order.groupingEnabled !== false ? (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              #{order.seq}
            </span>
          ) : null}
          {isSelected ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              <Trans>收起</Trans>
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {statusLabel(i18n, order.status)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {formatShanghaiHm(new Date(order.openedAt))}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <Trans>{order.lines.length} 项</Trans>
          </span>
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
      <div className="flex shrink-0 items-center gap-2 max-w-[45%] text-right">
        <p className={orderTotalCls(order.status)}>
          {formatYuan(order.totalCents)}
        </p>
        {showChevron ? (
          <ChevronRight
            className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${isSelected ? "rotate-90 text-primary" : "text-muted-foreground"} shrink-0`}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
