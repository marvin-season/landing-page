"use client";

import { Button } from "@landing-page/design-system";
import { Camera, CheckCircle2, ChevronRight, Clock3, Plus } from "lucide-react";
import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "@/components/link/link";
import { formatShanghaiHm } from "@/lib/bbq/business-day";
import { formatYuan } from "@/lib/bbq/money";
import type { Order } from "@/lib/bbq/types";
import { cls, touchCls } from "./bbq-layout";
import { bbqNewOrderPath } from "./bbq-paths";
import { OrderDetail } from "./order-detail";

function statusLabel(status: Order["status"]): string {
  return status === "open" ? "进行中" : "已完成";
}

function orderTotalCls(status: Order["status"]): string {
  const tone = status === "done" ? "text-muted-foreground" : "text-foreground";
  return `text-base font-semibold tabular-nums ${tone}`;
}

const orderWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden rounded-xl border-0 bg-transparent shadow-none gap-3
  grid-rows-[minmax(0,1fr)]
`;

const orderTabCls = cls`
  inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs
  font-medium transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const openOrders = orders.filter((order) => order.status === "open");
  const doneOrders = orders.filter((order) => order.status === "done");
  const visibleOrders = statusFilter === "open" ? openOrders : doneOrders;
  const selected =
    visibleOrders.find((order) => order.id === selectedId) ?? null;

  function changeFilter(status: Order["status"]) {
    if (status === statusFilter) return;
    onSelect(null);
    onFilterChange(status);
  }

  return (
    <div className={orderWorkspaceCls}>
      <section
        className="min-h-0 min-w-0 overflow-hidden rounded-xl border shadow-sm bg-muted/40 flex flex-col"
        aria-label="记录列表"
      >
        <div className="flex flex-col gap-2 border-b bg-card/95 px-3 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm text-foreground font-semibold">
                记录列表
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected
                  ? "再次点击记录可收起，查看全部记录"
                  : "点击记录展开详情"}
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
              onClick={() => changeFilter("open")}
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
              onClick={() => changeFilter("done")}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              已完成
              <span className="tabular-nums">{doneOrders.length}</span>
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
              读取记录中…
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 text-center flex-1 py-6">
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
            <ul className="divide-y-0 space-y-1.5 p-2 flex-1">
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
    </div>
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
      className={`relative h-[var(--row-height)] transition-opacity duration-200 motion-reduce:transition-none ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"} ${expanded || showDetail ? "z-10" : "z-0"}`}
    >
      <div
        className={`overflow-hidden rounded-lg border bg-card min-h-0 flex flex-col transition-[transform,height,border-color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${expanded ? "h-[var(--detail-height)] [transform:translateY(var(--row-offset))] border-primary/35" : "h-[var(--row-height)] transform-none border-transparent"}`}
      >
        <button
          ref={summaryRef}
          type="button"
          className={`${touchCls} w-full px-3 py-2.5 text-left transition-colors rounded-lg border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 duration-150 active:bg-primary/15 touch-manipulation motion-reduce:transition-none shrink-0 ${expanded ? "rounded-b-none border-transparent bg-primary/10 hover:bg-primary/10" : "border-transparent bg-card hover:bg-muted/70"}`}
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
            aria-label={`记录 #${order.seq} 详情`}
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
              收起
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
            className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${isSelected ? "rotate-90 text-primary" : "text-muted-foreground"}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
