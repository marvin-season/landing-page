"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Switch,
} from "@landing-page/design-system";
import {
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCalories, summarizeCalories } from "@/lib/bbq/calories";
import { bbqStore } from "@/lib/bbq/idb-store";
import {
  centsToYuanInput,
  formatYuan,
  parseYuanToCents,
} from "@/lib/bbq/money";
import type { Category, Dish } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { cls } from "./bbq-layout";
import { notifyBbqMenuChanged } from "./bbq-menu-events";
import { BbqSearch } from "./bbq-search";

const dishGridCls = cls`grid grid-cols-3 gap-2 min-w-0`;
const dishRowCls = cls`rounded-lg border bg-card p-2.5`;
const dishInputCls = cls`
  w-full min-w-0 rounded-lg border bg-background shadow-none h-11 px-2 text-base
  focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50
  focus-visible:ring-offset-0 placeholder:text-sm
`;

export function MenuEditor() {
  const [menu, setMenu] = useState<Category | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setMenu(category);
    setDishes(nextDishes);
  }, []);
  const handleSaved = useCallback(async () => {
    setMessage(null);
    await reload();
    notifyBbqMenuChanged();
    setNotice("菜单已更新");
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
    <div className="mx-auto flex w-full flex-col gap-3">
      <header className="flex gap-2 flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed
              className="size-4 text-primary"
              aria-hidden="true"
            />
            <h1 className="text-lg font-semibold text-foreground pr-24">
              菜单管理
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            管理常用消费或餐饮项目，设置单价、单位与热量
          </p>
        </div>
      </header>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
        <MenuMetric label="全部项目" value={`${dishes.length} 项`} />
        <MenuMetric label="已启用" value={`${listedCount} 项`} />
        <MenuMetric
          label="未启用"
          value={`${dishes.length - listedCount} 项`}
        />
      </dl>
      {notice && !message ? (
        <p
          className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {message ? (
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {message}
          </AlertDescription>
        </Alert>
      ) : null}
      {menu ? (
        <DishTable
          categoryId={menu.id}
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
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const matches = dishes.filter((dish) =>
    dish.name.toLocaleLowerCase().includes(query),
  );
  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-foreground">新增项目</h2>
          </div>
          <p className="text-muted-foreground mt-0 text-[11px]">
            热量按每单位填写：摄入填正数，跑步等消耗填负数，无需统计可留空
          </p>
        </div>
        <div className="p-2.5">
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
            <h2 className="text-sm font-medium text-foreground">已有项目</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              启用项目可在记账页面直接选择
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {dishes.length} 项
          </span>
        </div>
        {dishes.length > 0 ? (
          <BbqSearch
            value={search}
            onChange={setSearch}
            label="搜索已有项目…"
          />
        ) : null}
        {dishes.length > 0 && matches.length === 0 ? (
          <p
            className="py-6 text-center text-sm text-muted-foreground"
            role="status"
          >
            没有匹配的项目，请换个关键词
          </p>
        ) : null}
        {dishes.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border bg-card px-5 text-center">
            <UtensilsCrossed
              className="size-7 text-muted-foreground/60"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              还没有项目
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              使用上方表单添加第一个项目
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {dishes.map((dish) => (
              <div
                key={dish.id}
                className={
                  dish.name.toLocaleLowerCase().includes(query)
                    ? "contents"
                    : "hidden"
                }
              >
                <DishRow
                  dish={dish}
                  categoryId={categoryId}
                  onSaved={onSaved}
                  onError={onError}
                />
              </div>
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
  const fieldLabelCls = cls`text-muted-foreground text-xs`;
  const [name, setName] = useState(dish?.name ?? "");
  const [price, setPrice] = useState(
    dish ? centsToYuanInput(dish.priceCents) : "0",
  );
  const [calories, setCalories] = useState(
    dish?.caloriesKcal?.toString() ?? "",
  );
  const [unit, setUnit] = useState(dish?.unit ?? "份");
  const [sort, setSort] = useState(dish ? String(dish.sort) : "0");
  const [listed, setListed] = useState(dish?.listed ?? true);
  const [editing, setEditing] = useState(isNew);
  const savingRef = useRef(false);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dish) return;
    setName(dish.name);
    setPrice(centsToYuanInput(dish.priceCents));
    setCalories(dish.caloriesKcal?.toString() ?? "");
    setUnit(dish.unit);
    setSort(String(dish.sort));
    setListed(dish.listed);
  }, [dish]);

  async function commit() {
    if (savingRef.current) return;
    setError(null);
    const priceCents = parseYuanToCents(price.trim() || "0");
    const normalizedUnit = unit.trim() || "份";
    const parsedSort = parseSort(sort);
    const caloriesKcal = calories.trim() === "" ? null : Number(calories);
    if (
      caloriesKcal !== null &&
      (!/^-?\d+(?:\.\d+)?$/.test(calories.trim()) ||
        !Number.isFinite(caloriesKcal) ||
        Math.abs(caloriesKcal) > Number.MAX_SAFE_INTEGER)
    ) {
      setError("热量应为有效数字（kcal），运动消耗可填负数");
      return;
    }
    if (name.trim() === "") {
      setError("名称不能为空");
      nameRef.current?.focus();
      return;
    }
    if (priceCents === null) {
      setError("金额不正确");
      return;
    }
    if (parsedSort === null) {
      setError("排序要是整数");
      return;
    }
    if (
      dish &&
      name === dish.name &&
      priceCents === dish.priceCents &&
      caloriesKcal === (dish.caloriesKcal ?? null) &&
      normalizedUnit === dish.unit &&
      parsedSort === dish.sort &&
      listed === dish.listed
    ) {
      setEditing(false);
      return;
    }
    savingRef.current = true;
    setPending("save");
    let saved = false;
    try {
      await bbqStore.saveDish({
        id: dish?.id,
        categoryId: dish?.categoryId ?? categoryId,
        name,
        priceCents,
        caloriesKcal,
        unit: normalizedUnit,
        sort: parsedSort,
        listed,
      });
      if (isNew) {
        setName("");
        setPrice("0");
        setCalories("");
        setUnit("份");
        setSort("0");
        setListed(true);
      } else {
        setEditing(false);
      }
      await onSaved();
      saved = true;
    } catch (error) {
      setError(bbqErrorMessage(error));
      onError(bbqErrorMessage(error));
    } finally {
      savingRef.current = false;
      setPending(null);
      if (isNew && saved) {
        window.requestAnimationFrame(() => nameRef.current?.focus());
      }
    }
  }

  async function remove() {
    if (!dish || savingRef.current) return;
    if (!window.confirm(`删除“${dish.name}”？已有记录中的项目明细会保留。`))
      return;
    savingRef.current = true;
    setPending("delete");
    try {
      await bbqStore.deleteDish(dish.id);
      await onSaved();
    } catch (error) {
      onError(bbqErrorMessage(error));
    } finally {
      savingRef.current = false;
      setPending(null);
    }
  }

  function cancelEditing() {
    if (!dish || pending) return;
    setError(null);
    setName(dish.name);
    setPrice(centsToYuanInput(dish.priceCents));
    setCalories(dish.caloriesKcal?.toString() ?? "");
    setUnit(dish.unit);
    setSort(String(dish.sort));
    setListed(dish.listed);
    setEditing(false);
  }

  if (dish && !editing) {
    return (
      <article className="flex gap-2 rounded-lg border bg-card flex-row items-center p-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3
              className="truncate text-sm font-medium text-foreground"
              title={dish.name}
            >
              {dish.name}
            </h3>
            <span
              className={
                dish.listed
                  ? "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {dish.listed ? "已启用" : "未启用"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground break-words">
            <span className="tabular-nums text-foreground">
              {formatYuan(dish.priceCents)}
            </span>
            /{dish.unit}
            <span className="mx-2">·</span>
            排序 {dish.sort}
            <span className="mx-2">·</span>
            热量 {formatCalories(summarizeCalories([{ ...dish, quantity: 1 }]))}
            /{dish.unit}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="outline"
            className="size-11 flex-none rounded-lg px-0 shadow-none hover:bg-muted/70 hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0"
            disabled={pending !== null}
            aria-label={`编辑 ${dish.name}`}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">编辑</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive size-11 flex-none rounded-lg px-0 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-destructive/50 focus-visible:ring-offset-0"
            disabled={pending !== null}
            aria-label={`删除 ${dish.name}`}
            onClick={() => void remove()}
          >
            {pending === "delete" ? (
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">删除</span>
          </Button>
        </div>
      </article>
    );
  }

  return (
    <fieldset
      disabled={pending !== null}
      aria-busy={pending !== null}
      className={`${dishGridCls} ${isNew ? "" : dishRowCls}`}
    >
      <label className="col-span-3 flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>名称</span>
        <Input
          ref={nameRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={dishInputCls}
          autoComplete="off"
          aria-label="项目名称"
          placeholder={isNew ? "新项目" : undefined}
        />
      </label>
      <label className="col-span-3 flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>热量 kcal / 单位</span>
        <Input
          type="number"
          step="any"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          autoComplete="off"
          aria-label="每单位热量（kcal，选填）"
          placeholder="如 300 / -200"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>单价（选填）</span>
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          inputMode="decimal"
          autoComplete="off"
          aria-label="单价（选填，默认 0 元）"
          placeholder="0"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>单位（选填）</span>
        <Input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className={dishInputCls}
          autoComplete="off"
          aria-label="单位（选填，默认份）"
          placeholder="份"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>排序</span>
        <Input
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          inputMode="numeric"
          autoComplete="off"
          aria-label="排序（数字越大越靠前）"
          title="数字越大越靠前"
        />
      </label>
      <div className="flex min-h-11 justify-start items-center gap-2">
        <span className={fieldLabelCls}>启用</span>
        <div className="flex items-center justify-center min-h-9 min-w-0">
          <Switch
            checked={listed}
            aria-label="项目启用"
            onCheckedChange={setListed}
          />
        </div>
      </div>
      <div className="col-span-2 flex min-h-11 items-center justify-end gap-1.5">
        {dish ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 size-11"
            aria-label="取消编辑"
            title="取消编辑"
            onClick={cancelEditing}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="default"
          className="px-3 h-11 min-w-24 rounded-lg shadow-none hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0 shrink-0 whitespace-nowrap"
          onClick={() => void commit()}
        >
          {pending === "save" ? (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {pending === "save" ? "保存中…" : isNew ? "添加项目" : "保存"}
        </Button>
      </div>
      {error ? (
        <p
          className="col-span-3 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function MenuMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card py-2 flex flex-wrap items-center justify-between gap-x-1 px-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground mt-0 text-sm">
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
