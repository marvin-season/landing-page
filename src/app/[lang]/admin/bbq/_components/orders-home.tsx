"use client";

import { Alert, AlertDescription } from "@landing-page/design-system";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  canCreateOrderForBusinessDay,
  readBusinessDayParam,
} from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import { summarizeOrdersByBusinessDay } from "@/lib/bbq/statistics";
import type { Order } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { pageShellCls, pageTitleCls } from "./bbq-layout";
import { type HomeView, OrdersHomeTabs } from "./orders-home-tabs";
import { OrdersList } from "./orders-list";
import { OrdersStatistics } from "./orders-statistics";

export function OrdersHome() {
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order["status"]>("open");
  const [homeView, setHomeView] = useState<HomeView>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[] | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
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
    setSelectedId(null);
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
      setSelectedId((current) => (current === order.id ? null : current));
    } catch (error) {
      setMessage(bbqErrorMessage(error));
    } finally {
      setUpdatingStatusId(null);
    }
  }

  const statistics = summarizeOrdersByBusinessDay(allOrders ?? []);

  return (
    <div className={`${pageShellCls} overflow-hidden flex-1`}>
      <header className="flex shrink-0 flex-col gap-1.5">
        <div>
          <h1 className={pageTitleCls}>天天记账</h1>
          <p className="mt-1 text-xs text-muted-foreground">我的日常账本</p>
        </div>
        {storageFailed ? null : (
          <OrdersHomeTabs
            day={day}
            homeView={homeView}
            onViewChange={setHomeView}
          />
        )}
        {message ? (
          <Alert className="border-destructive/30 bg-destructive/5 p-3">
            <AlertDescription className="text-destructive">
              {message}
            </AlertDescription>
          </Alert>
        ) : null}
      </header>
      {storageFailed ? null : (
        <motion.div
          key={homeView}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16 }}
          className={`flex min-h-0 flex-1 flex-col ${homeView === "orders" ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"}`}
        >
          {homeView === "orders" ? (
            <OrdersList
              selectedId={selectedId}
              statusFilter={statusFilter}
              onSelect={setSelectedId}
              onFilterChange={setStatusFilter}
              orders={orders}
              loading={readyDay !== day}
              canCreateOrder={canCreateOrder}
              updatingStatusId={updatingStatusId}
              onToggleStatus={toggleOrderStatus}
            />
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
        </motion.div>
      )}
    </div>
  );
}
