"use client";

import { Button } from "@landing-page/design-system";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import type { BbqBackup, Order } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import {
  cardTotalCls,
  detailPaneCls,
  listPaneCls,
  navLinkCls,
  pageShellCls,
  splitCls,
  touchCls,
} from "./bbq-layout";
import {
  bbqHomePath,
  bbqMenuPath,
  bbqNewOrderPath,
  bbqOrderPath,
} from "./bbq-paths";
import { useBbqNavigate } from "./use-bbq-nav";

function statusLabel(status: Order["status"]): string {
  return status === "open" ? "进行中" : "已完成";
}

function orderTotalCls(status: Order["status"]): string {
  const tone = status === "done" ? "text-muted-foreground" : "text-foreground";
  return `${cardTotalCls} ${tone}`;
}

export function OrdersHome() {
  const searchParams = useSearchParams();
  const navigate = useBbqNavigate();
  const dayParam = searchParams.get("day");
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [twoPane, setTwoPane] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const [readyDay, setReadyDay] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setTwoPane(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
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

  async function reload() {
    const next = await bbqStore.listOrders(day);
    setOrders(next);
  }

  async function exportOrders() {
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
    if (twoPane) {
      setSelectedId(id);
      return;
    }
    navigate(bbqOrderPath(id));
  }

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  return (
    <div className={pageShellCls}>
      <header className="flex shrink-0 flex-col gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground">
          返回管理
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-pretty text-foreground">
            {day ? businessDayLabel(day) : "烧烤记账"}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href={
                day ? bbqHomePath(shiftBusinessDayKey(day, -1)) : "/admin/bbq"
              }
              className={navLinkCls}
            >
              上一档
            </Link>
            <Link
              href={
                day ? bbqHomePath(shiftBusinessDayKey(day, 1)) : "/admin/bbq"
              }
              className={navLinkCls}
            >
              下一档
            </Link>
          </div>
        </div>
        {storageFailed ? null : (
          <div className="flex flex-wrap gap-2">
            <Link href={bbqNewOrderPath()} className={navLinkCls}>
              开单
            </Link>
            <Link href={bbqMenuPath()} className={navLinkCls}>
              菜单
            </Link>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => void exportOrders()}
            >
              导出备份
            </Button>
            <label className={`${navLinkCls} cursor-pointer`}>
              导入备份
              <input
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
            </label>
          </div>
        )}
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
      </header>
      {storageFailed ? null : (
        <div className={splitCls}>
          <div className={listPaneCls}>
            {readyDay !== day ? (
              <p className="text-base text-muted-foreground">读取中</p>
            ) : orders.length === 0 ? (
              <p className="text-base text-muted-foreground">
                这一档还没有订单
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {orders.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      className={`${touchCls} w-full rounded-xl border bg-card px-4 py-3 text-left ${
                        selectedId === order.id ? "border-primary" : ""
                      }`}
                      onClick={() => openOrder(order.id)}
                    >
                      <OrderSummary order={order} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className={detailPaneCls}>
            {selected ? (
              <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto rounded-xl border bg-card p-4">
                <OrderSummary order={selected} />
                <ul className="flex flex-col gap-2 text-base">
                  {selected.lines.map((line) => (
                    <li key={line.id} className="flex justify-between gap-3">
                      <span>
                        {line.name} × {line.quantity}
                      </span>
                      <span className="tabular-nums">
                        {formatYuan(line.lineCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href={bbqOrderPath(selected.id)} className={navLinkCls}>
                  改这张单
                </Link>
              </div>
            ) : (
              <p className="text-base text-muted-foreground">选择一张订单</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">
          单号 {order.seq} · {order.seat} 号座
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {statusLabel(order.status)} ·{" "}
          {formatShanghaiHm(new Date(order.openedAt))}
        </p>
      </div>
      <p className={orderTotalCls(order.status)}>
        {formatYuan(order.totalCents)}
      </p>
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
