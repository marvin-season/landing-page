"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Switch,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Bookmark,
  ChevronDown,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { summarizeCalories } from "@/lib/bbq/calories";
import { bbqStore } from "@/lib/bbq/idb-store";
import {
  centsToYuanInput,
  formatYuan,
  parseYuanToCents,
} from "@/lib/bbq/money";
import {
  DEFAULT_TAG,
  getDishTagIds,
  matchesTag,
  resolveTagFilter,
} from "@/lib/bbq/tags";
import type { Category, Dish, ItemTag } from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { bbqErrorMessage } from "./bbq-errors";
import { formatCalories } from "./bbq-i18n";
import {
  cls,
  detailsChevronCls,
  detailsMotionCls,
  pageTitleCls,
} from "./bbq-layout";
import { notifyBbqMenuChanged } from "./bbq-menu-events";
import { BbqSearch } from "./bbq-search";
import { settingsCardCls, settingsSummaryCls } from "./bbq-settings-styles";
import { ItemTagBadge, ItemTagFilter, ItemTagSelect } from "./item-tags";

const dishGridCls = cls`grid grid-cols-3 gap-2 min-w-0`;
const dishRowCls = cls`rounded-lg border bg-muted/30 p-2.5 border-border/60`;
const dishInputCls = cls`
  w-full min-w-0 rounded-lg border bg-card shadow-none h-11 px-2 text-base
  focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50
  focus-visible:ring-offset-0 placeholder:text-sm text-card-foreground
`;

// 仅统一常用项目页的控件底色和标签色，不改变共享组件在其他页面的配色。
const menuColorsCls = cls`
  [&_[data-slot=input]]:bg-card [&_[data-slot=select-trigger]]:bg-card
  [&_[data-slot=item-tag]]:bg-secondary/50
  [&_[data-slot=item-tag]]:text-secondary-foreground!
  [&_[data-slot=item-tag]]:border-border!
`;

export function MenuEditor({
  variant = "page",
  sharedTags,
  onTagsChanged,
}: {
  variant?: "page" | "inline";
  sharedTags?: ItemTag[];
  onTagsChanged?: (tags: ItemTag[]) => void;
}) {
  const { i18n, t } = useLingui();
  const [menu, setMenu] = useState<Category | null>(null);
  const [tags, setTags] = useState<ItemTag[]>([]);
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [loadRequest, setLoadRequest] = useState(0);
  const [listRequested, setListRequested] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const categoryRequest = useRef<Promise<Category> | null>(null);

  const reload = useCallback(async () => {
    // 两个区域同时首次展开时，共用分类初始化，避免空库重复创建菜单。
    categoryRequest.current ??= bbqStore
      .listCategories()
      .then(
        (categories) =>
          categories[0] ??
          bbqStore.saveCategory({
            name: "菜单",
            sort: 0,
            listed: true,
          }),
      )
      .catch((error: unknown) => {
        categoryRequest.current = null;
        throw error;
      });
    const [category, nextDishes, nextTags] = await Promise.all([
      categoryRequest.current,
      // 新增表单只需要分类和标签；列表首次展开后才读取项目。
      listRequested ? bbqStore.listDishes() : Promise.resolve(null),
      bbqStore.listTags(),
    ]);
    setMenu(category);
    if (nextDishes !== null) setDishes(nextDishes);
    setTags(nextTags);
    onTagsChanged?.(nextTags);
  }, [listRequested, onTagsChanged]);
  const reloadTags = useCallback(async () => {
    const nextTags = await bbqStore.listTags();
    setTags(nextTags);
    onTagsChanged?.(nextTags);
  }, [onTagsChanged]);
  const handleSaved = useCallback(async () => {
    setMessage(null);
    await reload();
    notifyBbqMenuChanged();
    setNotice(t`常用项目已保存`);
  }, [reload, t]);

  useEffect(() => {
    if (loadRequest === 0) return;
    let cancelled = false;
    setPhase("loading");
    setMessage(null);
    void reload()
      .then(() => {
        if (!cancelled) setPhase("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(bbqErrorMessage(i18n, error));
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadRequest, reload, i18n]);

  const listedCount = dishes?.filter((dish) => dish.listed).length ?? "—";

  return (
    <div
      className={cls`${variant === "inline" ? "flex flex-col gap-2 shrink-0" : "mx-auto flex w-full flex-col gap-2 min-h-0 flex-1 overflow-hidden"} ${menuColorsCls}`}
    >
      {variant === "page" ? (
        <header className="flex gap-2 flex-row items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className={pageTitleCls}>
                <Trans>常用项目</Trans>
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Trans>常记的放这里 · {listedCount} 项可选</Trans>
            </p>
          </div>
        </header>
      ) : null}
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
      <div
        className={
          variant === "inline"
            ? undefined
            : "min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-3"
        }
      >
        <DishList
          showList={variant === "page"}
          categoryId={menu?.id ?? null}
          dishes={dishes}
          tags={sharedTags ?? tags}
          phase={phase}
          listRequested={listRequested}
          onRequest={() => setLoadRequest((request) => request || 1)}
          onRequestList={() => {
            setListRequested(true);
            setLoadRequest((request) => request || 1);
          }}
          onRetry={() => setLoadRequest((request) => request + 1)}
          onTagsChanged={reloadTags}
          onSaved={handleSaved}
          onError={setMessage}
        />
      </div>
    </div>
  );
}

function DishList({
  showList,
  categoryId,
  dishes,
  tags,
  phase,
  listRequested,
  onRequest,
  onRequestList,
  onRetry,
  onTagsChanged,
  onSaved,
  onError,
}: {
  showList: boolean;
  categoryId: string | null;
  dishes: Dish[] | null;
  tags: ItemTag[];
  phase: "loading" | "ready" | "error";
  listRequested: boolean;
  onRequest: () => void;
  onRequestList: () => void;
  onRetry: () => void;
  onTagsChanged: () => Promise<void>;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useLingui();
  const [tagFilter, setTagFilter] = useState("all");
  const activeTagFilter = resolveTagFilter(tags, tagFilter);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [addFormRequested, setAddFormRequested] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const matches = dishes?.filter(
    (dish) =>
      dish.name.toLocaleLowerCase().includes(query) &&
      matchesTag(dish, activeTagFilter),
  );
  return (
    <div className="flex flex-col gap-3">
      <details
        open={adding}
        onToggle={(event) => {
          setAdding(event.currentTarget.open);
          // 首次展开才挂载表单，随后收起时保留未保存的输入。
          if (event.currentTarget.open) {
            setAddFormRequested(true);
            onRequest();
          }
        }}
        className={`${settingsCardCls} ${detailsMotionCls}`}
      >
        <summary className={settingsSummaryCls}>
          <Plus className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground flex-1">
            <Trans>添加常用项目</Trans>
          </span>
          <BbqCompanion mood="chef" className="block size-8 shrink-0" />
          <ChevronDown className={detailsChevronCls} aria-hidden="true" />
        </summary>
        <div className="min-h-0 overflow-clip">
          {addFormRequested ? (
            categoryId ? (
              <div className="p-2.5 border-t bg-muted/30 border-border/60">
                <p className="text-muted-foreground text-[11px] mb-2">
                  <Trans>
                    热量按每单位填写：摄入填正数，消耗填负数，可留空
                  </Trans>
                </p>
                <DishRow
                  key="new"
                  tags={tags}
                  onTagsChanged={onTagsChanged}
                  categoryId={categoryId}
                  onSaved={onSaved}
                  onError={onError}
                />
              </div>
            ) : (
              <MenuLoadStatus phase={phase} onRetry={onRetry} />
            )
          ) : null}
        </div>
      </details>
      {showList ? (
        <details
          className={`${settingsCardCls} ${detailsMotionCls}`}
          onToggle={(event) => {
            if (event.currentTarget.open) onRequestList();
          }}
        >
          <summary className={settingsSummaryCls}>
            <Bookmark
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <h2 className="text-sm font-medium text-foreground flex-1">
              <Trans>我的常用</Trans>
            </h2>
            <span className="text-xs font-normal text-muted-foreground group-open/details:hidden">
              <Trans>展开查看全部项目</Trans>
            </span>
            <ChevronDown className={detailsChevronCls} aria-hidden="true" />
          </summary>
          <div className="min-h-0 overflow-clip">
            {listRequested ? (
              dishes ? (
                <>
                  <div className="sticky top-0 z-10 bg-background py-3 flex flex-col gap-2 px-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {dishes.length > 0 ? (
                        <div className="min-w-0 flex-1">
                          <BbqSearch
                            value={search}
                            onChange={setSearch}
                            label={t`搜索已有项目…`}
                          />
                        </div>
                      ) : null}
                      <ItemTagFilter
                        tags={tags}
                        value={activeTagFilter}
                        onChange={setTagFilter}
                      />
                    </div>
                  </div>
                  {dishes.length > 0 && matches?.length === 0 ? (
                    <p
                      className="py-6 text-center text-sm text-muted-foreground"
                      role="status"
                    >
                      <Trans>没有匹配的项目，请换个关键词</Trans>
                    </p>
                  ) : null}
                  {dishes.length === 0 ? (
                    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl bg-card px-5 text-center">
                      <BbqCompanion
                        mood="dance"
                        className="block size-32 shrink-0"
                      />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        <Trans>还没有项目</Trans>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <Trans>早餐、咖啡、跑步，从常记的开始。</Trans>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col rounded-xl bg-card overflow-hidden ring-1 ring-inset ring-border/60">
                      {dishes.map((dish) => (
                        <div
                          key={dish.id}
                          className={
                            dish.name.toLocaleLowerCase().includes(query) &&
                            matchesTag(dish, activeTagFilter)
                              ? "border-b border-border/60 last:border-b-0"
                              : "hidden"
                          }
                        >
                          <DishRow
                            dish={dish}
                            tags={tags}
                            onTagsChanged={onTagsChanged}
                            categoryId={dish.categoryId}
                            onSaved={onSaved}
                            onError={onError}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <MenuLoadStatus phase={phase} onRetry={onRetry} />
              )
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function MenuLoadStatus({
  phase,
  onRetry,
}: {
  phase: "loading" | "ready" | "error";
  onRetry: () => void;
}) {
  return (
    <div
      className="py-6 text-center text-sm text-muted-foreground"
      role="status"
    >
      {phase === "error" ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          <Trans>Retry</Trans>
        </Button>
      ) : (
        <Trans>读取常用项目中…</Trans>
      )}
    </div>
  );
}

export function DishRow({
  dish,
  tags,
  onTagsChanged,
  categoryId,
  onSaved,
  onError,
}: {
  dish?: Dish;
  tags: ItemTag[];
  onTagsChanged: () => Promise<void>;
  categoryId: string;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { i18n, t } = useLingui();
  const isNew = dish === undefined;
  const [tagIds, setTagIds] = useState<string[]>(
    dish ? getDishTagIds(dish) : [DEFAULT_TAG.id],
  );
  const fieldLabelCls = cls`text-foreground/80 text-xs`;
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
  const [tagPending, setTagPending] = useState(false);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dish) return;
    setTagIds(getDishTagIds(dish));
    setName(dish.name);
    setPrice(centsToYuanInput(dish.priceCents));
    setCalories(dish.caloriesKcal?.toString() ?? "");
    setUnit(dish.unit);
    setSort(String(dish.sort));
    setListed(dish.listed);
  }, [dish]);

  async function commit() {
    if (savingRef.current || tagPending) return;
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
      setError(t`热量应为有效数字（kcal），运动消耗可填负数`);
      return;
    }
    if (name.trim() === "") {
      setError(t`名称不能为空`);
      nameRef.current?.focus();
      return;
    }
    if (priceCents === null) {
      setError(t`金额不正确`);
      return;
    }
    if (parsedSort === null) {
      setError(t`排序要是整数`);
      return;
    }
    if (
      dish &&
      name === dish.name &&
      priceCents === dish.priceCents &&
      caloriesKcal === (dish.caloriesKcal ?? null) &&
      normalizedUnit === dish.unit &&
      parsedSort === dish.sort &&
      listed === dish.listed &&
      tagIds.length === getDishTagIds(dish).length &&
      tagIds.every((id) => getDishTagIds(dish).includes(id))
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
        tagIds:
          dish && getDishTagIds(dish).length === 0 && tagIds.length === 0
            ? undefined
            : tagIds,
        categoryId: dish?.categoryId ?? categoryId,
        name,
        priceCents,
        caloriesKcal,
        unit: normalizedUnit,
        sort: parsedSort,
        listed,
      });
      if (isNew) {
        setTagIds([DEFAULT_TAG.id]);
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
      setError(bbqErrorMessage(i18n, error));
      onError(bbqErrorMessage(i18n, error));
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
    if (!window.confirm(t`删除“${dish.name}”？已有记录中的项目明细会保留。`))
      return;
    savingRef.current = true;
    setPending("delete");
    try {
      await bbqStore.deleteDish(dish.id);
      await onSaved();
    } catch (error) {
      onError(bbqErrorMessage(i18n, error));
    } finally {
      savingRef.current = false;
      setPending(null);
    }
  }

  function cancelEditing() {
    if (!dish || pending) return;
    setError(null);
    setTagIds(getDishTagIds(dish));
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
      <article className="flex gap-1.5 bg-card flex-row items-center px-2.5 py-1.5 text-card-foreground">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3
              className="truncate text-sm font-medium text-foreground"
              title={dish.name}
            >
              {dish.name}
            </h3>
            <div className="flex min-w-0 flex-wrap gap-1 [&_[data-slot=item-tag]]:px-1.5 [&_[data-slot=item-tag]]:py-0 [&_[data-slot=item-tag]]:text-[10px] [&_[data-slot=item-tag]]:leading-4">
              {tags
                .filter((tag) => getDishTagIds(dish).includes(tag.id))
                .map((tag) => (
                  <ItemTagBadge key={tag.id} tag={tag} />
                ))}
            </div>
            <span
              className={
                dish.listed
                  ? "sr-only"
                  : "shrink-0 text-xs text-muted-foreground"
              }
            >
              {dish.listed ? t`已启用` : t`未启用`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground break-words leading-4">
            <span className="tabular-nums text-foreground">
              {formatYuan(dish.priceCents)}
            </span>
            /{dish.unit}
            <span className="mx-1.5">·</span>
            <Trans>
              热量{" "}
              {formatCalories(
                i18n,
                summarizeCalories([{ ...dish, quantity: 1 }]),
              )}
              /{dish.unit}
            </Trans>
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="subtle"
            className="size-9 flex-none rounded-lg px-0 shadow-none hover:bg-primary/15 hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0"
            disabled={pending !== null}
            aria-label={t`编辑 ${dish.name}`}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">
              <Trans>编辑</Trans>
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive size-9 flex-none rounded-lg px-0 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-destructive/50 focus-visible:ring-offset-0"
            disabled={pending !== null}
            aria-label={t`删除 ${dish.name}`}
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
            <span className="sr-only">
              <Trans>删除</Trans>
            </span>
          </Button>
        </div>
      </article>
    );
  }

  return (
    <fieldset
      disabled={pending !== null || tagPending}
      aria-busy={pending !== null || tagPending}
      className={`${dishGridCls} ${isNew ? "" : dishRowCls}`}
    >
      <label className="col-span-3 flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>
          <Trans>名称</Trans>
        </span>
        <Input
          ref={nameRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={dishInputCls}
          autoComplete="off"
          aria-label={t`项目名称`}
          placeholder={isNew ? t`新项目` : undefined}
        />
      </label>
      <div className="col-span-3 flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>
          <Trans>标签</Trans>
        </span>
        <ItemTagSelect
          tags={tags}
          value={tagIds}
          onChange={setTagIds}
          onTagsChanged={onTagsChanged}
          onPendingChange={setTagPending}
          disabled={pending !== null}
        />
      </div>
      <label className="col-span-3 flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>
          <Trans>热量 kcal / 单位</Trans>
        </span>
        <Input
          type="number"
          step="any"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          autoComplete="off"
          aria-label={t`每单位热量（kcal，选填）`}
          placeholder="0"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>
          <Trans>单价（选填）</Trans>
        </span>
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          inputMode="decimal"
          autoComplete="off"
          aria-label={t`单价（选填，默认 0 元）`}
          placeholder="0"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>
          <Trans>单位（选填）</Trans>
        </span>
        <Input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className={dishInputCls}
          autoComplete="off"
          aria-label={t`单位（选填，默认份）`}
          placeholder={t`份`}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={fieldLabelCls}>
          <Trans>排序</Trans>
        </span>
        <Input
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className={`${dishInputCls} tabular-nums`}
          inputMode="numeric"
          autoComplete="off"
          aria-label={t`排序（数字越大越靠前）`}
          title={t`数字越大越靠前`}
        />
      </label>
      <div className="flex min-h-11 justify-start items-center gap-2">
        <span className={fieldLabelCls}>
          <Trans>启用</Trans>
        </span>
        <div className="flex items-center justify-center min-h-9 min-w-0">
          <Switch
            checked={listed}
            aria-label={t`项目启用`}
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
            className="shrink-0 size-11 text-muted-foreground hover:text-foreground"
            aria-label={t`取消编辑`}
            title={t`取消编辑`}
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
          {pending === "save" ? t`保存中…` : isNew ? t`添加项目` : t`保存`}
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

function parseSort(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
