"use client";

import { Button, Input, Switch } from "@landing-page/design-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/components/link/link";
import { bbqStore } from "@/lib/bbq/idb-store";
import {
  centsToYuanInput,
  formatYuan,
  parseYuanToCents,
} from "@/lib/bbq/money";
import type { Dish } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { cls } from "./bbq-layout";
import { notifyBbqMenuChanged } from "./bbq-menu-events";

const dishGridCls = cls`
  grid grid-cols-2 gap-3
  md:grid-cols-[minmax(0,1fr)_5rem_4rem_4rem_4rem_4rem] md:gap-0
`;
const dishRowCls = cls`
  rounded-xl border bg-card p-3
  md:items-end md:rounded-none md:border-x-0 md:border-t-0 md:p-0
`;
const dishInputCls = cls`
  h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base shadow-none
  md:rounded-none md:border-0 md:bg-transparent md:px-2 md:text-base
`;

export function MenuEditor() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [categories, nextDishes] = await Promise.all([
      bbqStore.listCategories(),
      bbqStore.listDishes(),
    ]);
    const category =
      categories[0] ??
      (await bbqStore.saveCategory({
        name: "菜单",
        sort: 0,
        listed: true,
      }));
    setCategoryId(category.id);
    setDishes(nextDishes);
  }, []);
  const handleSaved = useCallback(async () => {
    setMessage(null);
    await reload();
    notifyBbqMenuChanged();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    void reload()
      .then(() => {
        if (!cancelled) setPhase("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(bbqErrorMessage(error));
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (phase === "loading") {
    return <p className="text-sm text-muted-foreground">读取中</p>;
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <Link href="/admin/bbq" className="text-sm text-muted-foreground">
          返回
        </Link>
        <p className="text-base">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/bbq" className="text-sm text-muted-foreground">
          返回
        </Link>
        <h1 className="text-xl font-semibold text-foreground">菜单</h1>
      </header>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {categoryId ? (
        <DishTable
          categoryId={categoryId}
          dishes={dishes}
          onSaved={handleSaved}
          onError={setMessage}
        />
      ) : null}
    </div>
  );
}

function DishTable({
  categoryId,
  dishes,
  onSaved,
  onError,
}: {
  categoryId: string;
  dishes: Dish[];
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border border-dashed bg-muted/30 p-3">
        <div className={`${dishGridCls} hidden px-2 md:grid`}>
          <span className="text-sm text-muted-foreground">名称</span>
          <span className="text-sm text-muted-foreground">单价</span>
          <span className="text-sm text-muted-foreground">单位</span>
          <span className="text-sm text-muted-foreground">排序</span>
          <span className="text-sm text-muted-foreground">上架</span>
          <span className="text-sm text-muted-foreground">操作</span>
        </div>
        <DishRow
          key="new"
          categoryId={categoryId}
          onSaved={onSaved}
          onError={onError}
        />
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-medium text-foreground">菜品列表</h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {dishes.length} 项
          </span>
        </div>
        {dishes.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            还没有菜品
          </p>
        ) : (
          <div className="flex flex-col gap-3 md:gap-0 md:border-t">
            {dishes.map((dish) => (
              <DishRow
                key={dish.id}
                dish={dish}
                categoryId={categoryId}
                onSaved={onSaved}
                onError={onError}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DishRow({
  dish,
  categoryId,
  onSaved,
  onError,
}: {
  dish?: Dish;
  categoryId: string;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const isNew = dish === undefined;
  const [name, setName] = useState(dish?.name ?? "");
  const [price, setPrice] = useState(
    dish ? centsToYuanInput(dish.priceCents) : "",
  );
  const [unit, setUnit] = useState(dish?.unit ?? "");
  const [sort, setSort] = useState(dish ? String(dish.sort) : "0");
  const [listed, setListed] = useState(dish?.listed ?? true);
  const [editing, setEditing] = useState(isNew);
  const savingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dish) return;
    setName(dish.name);
    setPrice(centsToYuanInput(dish.priceCents));
    setUnit(dish.unit);
    setSort(String(dish.sort));
    setListed(dish.listed);
  }, [dish]);

  async function commit() {
    if (savingRef.current) return;
    const priceCents = parseYuanToCents(price);
    const parsedSort = parseSort(sort);
    if (name.trim() === "") {
      onError("名称不能为空");
      return;
    }
    if (priceCents === null) {
      onError("金额不正确");
      return;
    }
    if (unit.trim() === "") {
      onError("单位不能为空");
      return;
    }
    if (parsedSort === null) {
      onError("排序要是整数");
      return;
    }
    if (
      dish &&
      name === dish.name &&
      priceCents === dish.priceCents &&
      unit === dish.unit &&
      parsedSort === dish.sort &&
      listed === dish.listed
    ) {
      setEditing(false);
      return;
    }
    savingRef.current = true;
    try {
      await bbqStore.saveDish({
        id: dish?.id,
        categoryId: dish?.categoryId ?? categoryId,
        name,
        priceCents,
        unit,
        sort: parsedSort,
        listed,
      });
      if (isNew) {
        setName("");
        setPrice("");
        setUnit("");
        setSort("0");
        setListed(true);
        nameRef.current?.focus();
      } else {
        setEditing(false);
      }
      await onSaved();
    } catch (error) {
      onError(bbqErrorMessage(error));
    } finally {
      savingRef.current = false;
    }
  }

  async function remove() {
    if (!dish || savingRef.current) return;
    if (!window.confirm("删除这个菜品？")) return;
    savingRef.current = true;
    try {
      await bbqStore.deleteDish(dish.id);
      await onSaved();
    } catch (error) {
      onError(bbqErrorMessage(error));
    } finally {
      savingRef.current = false;
    }
  }

  if (dish && !editing) {
    return (
      <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-medium text-foreground">
              {dish.name}
            </h3>
            <span
              className={
                dish.listed
                  ? "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {dish.listed ? "已上架" : "未上架"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="tabular-nums text-foreground">
              {formatYuan(dish.priceCents)}
            </span>
            /{dish.unit}
            <span className="mx-2">·</span>
            排序 {dish.sort}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 px-4 sm:flex-none"
            onClick={() => setEditing(true)}
          >
            编辑
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 flex-1 px-4 text-destructive sm:flex-none"
            onClick={() => void remove()}
          >
            删除
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className={`${dishGridCls} ${dishRowCls}`}>
      <label className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1 md:block">
        <span className="text-xs text-muted-foreground md:sr-only">名称</span>
        <Input
          ref={nameRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={dishInputCls}
          autoComplete="off"
          aria-label="菜品名称"
          placeholder={isNew ? "新菜品" : undefined}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 md:block">
        <span className="text-xs text-muted-foreground md:sr-only">单价</span>
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          inputMode="decimal"
          autoComplete="off"
          aria-label="单价"
          placeholder={isNew ? "0.00" : undefined}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 md:block">
        <span className="text-xs text-muted-foreground md:sr-only">单位</span>
        <Input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className={dishInputCls}
          autoComplete="off"
          aria-label="单位"
          placeholder={isNew ? "串" : undefined}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 md:block">
        <span className="text-xs text-muted-foreground md:sr-only">排序</span>
        <Input
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          inputMode="numeric"
          autoComplete="off"
          aria-label="排序"
        />
      </label>
      <div className="flex min-h-11 items-center justify-between gap-2 md:justify-center">
        <span className="text-xs text-muted-foreground md:sr-only">上架</span>
        <div className="flex min-h-11 min-w-11 items-center justify-center">
          <Switch
            checked={listed}
            aria-label="菜品上架"
            onCheckedChange={setListed}
          />
        </div>
      </div>
      <div className="flex min-h-11 items-end justify-end md:items-center">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 px-3 md:w-full md:px-1"
          onClick={() => void commit()}
        >
          保存
        </Button>
      </div>
    </div>
  );
}

function parseSort(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
