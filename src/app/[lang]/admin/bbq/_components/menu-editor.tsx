"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Switch,
} from "@landing-page/design-system";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Save,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
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
  grid grid-cols-2 gap-2
  md:grid-cols-[minmax(0,1fr)_7rem_5rem_5rem_5rem_6rem] md:gap-0
`;
const dishRowCls = cls`
  rounded-lg border bg-card p-2.5
  md:items-center md:rounded-none md:border-x-0 md:border-t-0 md:p-0
`;
const dishInputCls = cls`
  h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm shadow-none
  md:rounded-none md:border-0 md:bg-transparent md:px-2 md:text-sm
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
    return (
      <div
        className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        读取菜单中…
      </div>
    );
  }

  if (phase === "error") {
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
            {message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const listedCount = dishes.filter((dish) => dish.listed).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/bbq"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回订单
        </Link>
        <div>
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed
              className="size-4 text-primary"
              aria-hidden="true"
            />
            <h1 className="text-lg font-semibold text-foreground">菜单管理</h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            维护菜品价格、单位、展示顺序和上架状态
          </p>
        </div>
      </header>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
        <MenuMetric label="全部菜品" value={`${dishes.length} 项`} />
        <MenuMetric label="已上架" value={`${listedCount} 项`} />
        <MenuMetric
          label="未上架"
          value={`${dishes.length - listedCount} 项`}
        />
      </dl>
      {message ? (
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {message}
          </AlertDescription>
        </Alert>
      ) : null}
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
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-foreground">新增菜品</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            保存后会立即出现在已上架菜单中
          </p>
        </div>
        <div className="p-2.5">
          <div className={`${dishGridCls} hidden px-2 pb-1.5 md:grid`}>
            <span className="text-xs text-muted-foreground">名称</span>
            <span className="text-xs text-muted-foreground">单价</span>
            <span className="text-xs text-muted-foreground">单位</span>
            <span className="text-xs text-muted-foreground">排序</span>
            <span className="text-xs text-muted-foreground">上架</span>
            <span className="text-xs text-muted-foreground">操作</span>
          </div>
          <DishRow
            key="new"
            categoryId={categoryId}
            onSaved={onSaved}
            onError={onError}
          />
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">已有菜品</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              上架菜品可在开单页面直接选择
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {dishes.length} 项
          </span>
        </div>
        {dishes.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border bg-card px-5 text-center">
            <UtensilsCrossed
              className="size-7 text-muted-foreground/60"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              还没有菜品
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              使用上方表单添加第一项菜品
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:gap-0 md:overflow-hidden md:rounded-xl md:border md:bg-card md:shadow-sm">
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

  function cancelEditing() {
    if (!dish) return;
    setName(dish.name);
    setPrice(centsToYuanInput(dish.priceCents));
    setUnit(dish.unit);
    setSort(String(dish.sort));
    setListed(dish.listed);
    setEditing(false);
  }

  if (dish && !editing) {
    return (
      <article className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center md:rounded-none md:border-0 md:border-b md:last:border-b-0">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">
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
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums text-foreground">
              {formatYuan(dish.priceCents)}
            </span>
            /{dish.unit}
            <span className="mx-2">·</span>
            排序 {dish.sort}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-9 flex-1 px-3 sm:flex-none"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            编辑
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 flex-1 px-3 text-destructive sm:flex-none"
            onClick={() => void remove()}
          >
            <Trash2 className="size-4" aria-hidden="true" />
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
      <div className="flex min-h-10 items-center justify-between gap-2 md:justify-center">
        <span className="text-xs text-muted-foreground md:sr-only">上架</span>
        <div className="flex min-h-10 min-w-10 items-center justify-center">
          <Switch
            checked={listed}
            aria-label="菜品上架"
            onCheckedChange={setListed}
          />
        </div>
      </div>
      <div className="col-span-2 flex min-h-10 items-end justify-end gap-1.5 md:col-span-1 md:items-center md:px-1">
        {dish ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0"
            aria-label="取消编辑"
            title="取消编辑"
            onClick={cancelEditing}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 px-3 md:px-2"
          onClick={() => void commit()}
        >
          <Save className="size-4" aria-hidden="true" />
          {isNew ? "添加" : "保存"}
        </Button>
      </div>
    </div>
  );
}

function MenuMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function parseSort(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
