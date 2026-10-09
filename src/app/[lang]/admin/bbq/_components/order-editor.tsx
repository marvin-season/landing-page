"use client";

import { Button, Switch } from "@landing-page/design-system";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/components/link/link";
import { formatShanghaiHm } from "@/lib/bbq/business-day";
import { bbqStore } from "@/lib/bbq/idb-store";
import { formatYuan, lineCents, totalCents } from "@/lib/bbq/money";
import type { Dish, Order, OrderStatus } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import {
  editorTotalCls,
  menuPaneCls,
  navLinkCls,
  orderBodyCls,
  orderPaneCls,
  pageShellCls,
  splitCls,
  totalBarCls,
  touchCls,
} from "./bbq-layout";
import { BBQ_MENU_CHANGED_EVENT } from "./bbq-menu-events";
import { bbqHomePath, bbqMenuPath } from "./bbq-paths";
import { useBbqNavigate } from "./use-bbq-nav";

const SEATS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

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
  const [phase, setPhase] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const status: OrderStatus = done ? "done" : "open";
    try {
      const saved = await bbqStore.saveOrder({
        id: order?.id,
        seat,
        status,
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
    return <p className="text-sm text-muted-foreground">读取中</p>;
  }

  if (phase === "error" || phase === "missing") {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/admin/bbq" className="text-sm text-muted-foreground">
          返回
        </Link>
        <p className="text-base text-foreground">
          {phase === "missing" ? "没有找到这张订单" : message}
        </p>
      </div>
    );
  }

  return (
    <div className={pageShellCls}>
      <header className="flex shrink-0 flex-col gap-2">
        <Link
          href={order ? bbqHomePath(order.businessDayKey) : "/admin/bbq"}
          className="text-sm text-muted-foreground"
        >
          返回
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground">
            {order ? `改单 ${order.seq}` : "开单"}
          </h1>
          <Link href={bbqMenuPath()} className={navLinkCls}>
            菜单
          </Link>
        </div>
        {order ? (
          <p className="text-sm text-muted-foreground">
            {formatShanghaiHm(new Date(order.openedAt))}
          </p>
        ) : null}
      </header>
      <div className={splitCls}>
        <section className={menuPaneCls}>
          <h2 className="text-base font-medium text-foreground">菜单</h2>
          {availableDishes.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">
              还没有上架的菜。先去菜单里上架。
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {availableDishes.map((dish) => (
                <Button
                  key={dish.id}
                  type="button"
                  variant="outline"
                  className={`${touchCls} w-full justify-between rounded-xl px-3 text-base`}
                  onClick={() => addDish(dish)}
                >
                  <span className="truncate">{dish.name}</span>
                  <span className="tabular-nums">
                    {formatYuan(dish.priceCents)}/{dish.unit}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </section>
        <section className={orderPaneCls}>
          <div className={orderBodyCls}>
            <h2 className="text-base font-medium text-foreground">座号</h2>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant={seat === null ? "default" : "outline"}
                aria-pressed={seat === null}
                className={`${touchCls} col-span-4 min-w-11 text-base`}
                onClick={() => setSeat(null)}
              >
                打包
              </Button>
              {SEATS.map((number) => (
                <Button
                  key={number}
                  type="button"
                  variant={seat === number ? "default" : "outline"}
                  aria-pressed={seat === number}
                  className={`${touchCls} min-w-11 text-base`}
                  onClick={() => setSeat(number)}
                >
                  {number}
                </Button>
              ))}
            </div>
            <h2 className="mt-4 text-base font-medium text-foreground">明细</h2>
            {lines.length === 0 ? (
              <p className="mt-2 text-base text-muted-foreground">还没点菜</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-foreground">
                        {line.name}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatYuan(line.priceCents)}/{line.unit}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={`${touchCls} min-w-11 px-0 text-base`}
                      onClick={() => changeQuantity(line.key, -1)}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center text-base tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className={`${touchCls} min-w-11 px-0 text-base`}
                      onClick={() => changeQuantity(line.key, 1)}
                    >
                      +
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <label className="mt-4 inline-flex min-h-11 items-center gap-3 text-base">
              <Switch checked={done} onCheckedChange={setDone} />
              {done ? "已完成" : "进行中"}
            </label>
            {order ? (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={saving}
                  onClick={() => void removeOrder()}
                >
                  删除这张订单
                </Button>
              </div>
            ) : null}
            {message ? (
              <p className="mt-3 text-sm text-destructive">{message}</p>
            ) : null}
          </div>
          <TotalBar>
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">总额</p>
                <p className={editorTotalCls}>{formatYuan(total)}</p>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={saving}
                onClick={() => void save()}
              >
                保存
              </Button>
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
