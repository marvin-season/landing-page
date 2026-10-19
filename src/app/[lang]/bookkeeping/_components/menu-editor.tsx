"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
} from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { bbqStore } from "@/lib/bbq/idb-store";
import { centsToYuanInput, parseYuanToCents } from "@/lib/bbq/money";
import {
  DEFAULT_TAG,
  getDishTagIds,
  matchesTag,
  resolveTagFilter,
} from "@/lib/bbq/tags";
import type { Category, Dish, ItemTag } from "@/lib/bbq/types";
import { BbqCompanion } from "./bbq-companion";
import { bbqErrorMessage } from "./bbq-errors";
import {
  cls,
  detailsChevronCls,
  detailsMotionCls,
  pageTitleCls,
} from "./bbq-layout";
import { notifyBbqMenuChanged } from "./bbq-menu-events";
import { BbqSearch } from "./bbq-search";
import { settingsCardCls, settingsSummaryCls } from "./bbq-settings-styles";
import { DishItem } from "./dish-item";
import {
  ExpandingItemEditor,
  ItemEditViewport,
  useItemEditSelection,
} from "./item-edit-viewport";
import { ItemTagFilter, ItemTagSelect } from "./item-tags";

const dishGridCls = cls`grid grid-cols-2 gap-2 min-w-0 items-end`;
const dishFieldCls = cls`flex min-w-0 flex-col gap-1`;
const dishRowCls = cls`gap-x-3 gap-y-2.5 [&_[data-slot=input]]:border-border/70 [&_[data-slot=button]]:shadow-none`;
const dishInputCls = cls`
  w-full min-w-0 rounded-lg border bg-card shadow-none h-9 px-2 text-base
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
  open,
  onOpenChange,
}: {
  variant?: "page" | "inline";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  const [localOpen, setLocalOpen] = useState(false);
  const [inlineFormRequested, setInlineFormRequested] = useState(false);
  const categoryRequest = useRef<Promise<Category> | null>(null);
  const listHeaderRef = useRef<HTMLDivElement>(null);

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

  const adding = open ?? localOpen;
  function changeAdding(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
    if (next) {
      setInlineFormRequested(true);
      setLoadRequest((request) => request || 1);
    }
  }

  if (variant === "inline") {
    return (
      <Collapsible
        open={adding}
        onOpenChange={changeAdding}
        className={cls`shrink-0 ${menuColorsCls}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation();
            changeAdding(false);
          }
        }}
      >
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="relative z-30 h-14 w-full justify-start gap-2 rounded-xl border border-border/60 bg-card/85 px-3 py-2 text-sm shadow-none backdrop-blur-xl hover:bg-card/90 hover:shadow-none"
          >
            <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-left">
              <Trans>添加常用项目</Trans>
            </span>
            {adding ? (
              <span className="text-xs font-normal text-muted-foreground">
                <Trans>收起</Trans>
              </span>
            ) : (
              <BbqCompanion mood="chef" className="block size-8 shrink-0" />
            )}
            <ChevronDown
              className={cls`size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${adding ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
        <button
          type="button"
          className={cls`absolute inset-0 z-20 bg-background/40 backdrop-blur-xs transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${adding ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}
          tabIndex={-1}
          inert={!adding}
          aria-hidden={!adding || undefined}
          aria-label={t`收起`}
          onClick={() => changeAdding(false)}
        />
        {/* 定位到记账内容区，始终只为入口占位；表单收起后保留输入。 */}
        <CollapsibleContent
          forceMount
          inert={!adding}
          aria-hidden={!adding || undefined}
          className="absolute inset-x-0 top-16 bottom-2 z-30 pointer-events-none overflow-clip"
        >
          <div
            className={cls`max-h-full overflow-y-auto overscroll-y-contain rounded-xl border border-border/60 bg-card/85 p-3 shadow-lg backdrop-blur-xl transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none ${adding ? "visible translate-y-0 pointer-events-auto" : "invisible -translate-y-full pointer-events-none"}`}
          >
            {notice && !message ? (
              <p className="mb-3 text-sm text-primary" role="status">
                {notice}
              </p>
            ) : null}
            {message ? (
              <Alert className="mb-3 border-destructive/30 bg-destructive/5 p-3">
                <AlertDescription className="text-destructive">
                  {message}
                </AlertDescription>
              </Alert>
            ) : null}
            {inlineFormRequested ? (
              <div className="relative">
                {/* 首次加载也保留完整表单尺寸，避免短提示突然撑成整张表单。 */}
                <fieldset disabled={!menu} aria-busy={!menu}>
                  <p className="text-muted-foreground text-[11px] mb-2">
                    <Trans>
                      热量按每单位填写：摄入填正数，消耗填负数，可留空
                    </Trans>
                  </p>
                  <DishRow
                    tags={sharedTags ?? tags}
                    onTagsChanged={reloadTags}
                    categoryId={menu?.id ?? ""}
                    onSaved={handleSaved}
                    onError={setMessage}
                  />
                </fieldset>
                {!menu ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm">
                    <MenuLoadStatus
                      phase={phase}
                      onRetry={() => setLoadRequest((request) => request + 1)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const listedCount = dishes?.filter((dish) => dish.listed).length ?? "—";

  return (
    <div
      className={cls`mx-auto flex w-full flex-col gap-2 min-h-0 flex-1 overflow-hidden ${menuColorsCls}`}
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
      <ItemEditViewport
        headerRef={listHeaderRef}
        className="flex-1"
        scrollClassName="min-h-0 h-full overflow-y-auto overscroll-y-contain pb-3"
      >
        <DishList
          headerRef={listHeaderRef}
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
      </ItemEditViewport>
    </div>
  );
}

function DishList({
  headerRef,
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
  headerRef: RefObject<HTMLDivElement | null>;
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
                  <div
                    ref={headerRef}
                    className="sticky top-0 z-10 bg-background py-3 flex flex-col gap-2 px-3"
                  >
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
  managing = true,
  quantity = 0,
  onAdd,
  tags,
  onTagsChanged,
  categoryId,
  onSaved,
  onError,
}: {
  dish?: Dish;
  managing?: boolean;
  quantity?: number;
  onAdd?: (dish: Dish) => void;
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
  const fieldLabelCls = cls`text-foreground/80 text-xs leading-4 wrap-anywhere`;
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
  const [localEditing, setLocalEditing] = useState(isNew);
  const selection = useItemEditSelection();
  const editing =
    dish && selection ? selection.selectedId === dish.id : localEditing;
  function setEditing(next: boolean) {
    if (dish && selection) selection.select(next ? dish.id : null);
    else setLocalEditing(next);
  }
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
      setEditing(false);
      await onSaved();
    } catch (error) {
      onError(bbqErrorMessage(i18n, error));
    } finally {
      savingRef.current = false;
      setPending(null);
    }
  }

  function cancelEditing() {
    if (!dish || pending || tagPending) return;
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

  const renderSummary = (isEditing: boolean) =>
    dish ? (
      <DishItem
        className={
          isEditing
            ? "rounded-none border-0 bg-transparent px-3 py-3 data-[selected=true]:bg-transparent"
            : undefined
        }
        dish={dish}
        tags={tags}
        quantity={quantity}
        disabled={pending !== null || tagPending}
        actionLabel={
          isEditing
            ? t`收起`
            : managing
              ? t`编辑 ${dish.name}`
              : t`添加 ${dish.name}，已选 ${quantity} 件`
        }
        onActivate={() => {
          if (isEditing) cancelEditing();
          else if (managing) setEditing(true);
          else if (dish.listed) onAdd?.(dish);
        }}
        actions={
          isEditing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-lg px-1.5 text-xs shadow-none [&_svg]:size-3.5"
                disabled={pending !== null || tagPending}
                onClick={cancelEditing}
              >
                <Trans>收起</Trans>
                <ChevronDown data-icon="inline-end" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive size-9 flex-none rounded-lg hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
                disabled={pending !== null || tagPending}
                aria-label={t`删除 ${dish.name}`}
                onClick={() => void remove()}
              >
                {pending === "delete" ? (
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <Trash2 strokeWidth={1.5} fill="none" />
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 flex-none rounded-lg shadow-none hover:bg-muted/50 hover:shadow-none [@media(hover:hover)]:opacity-0 group-hover/dish:opacity-100 group-focus-within/dish:opacity-100 focus-visible:opacity-100 [&_svg]:size-3.5"
                disabled={pending !== null || tagPending}
                aria-label={t`编辑 ${dish.name}`}
                title={t`编辑`}
                onClick={() => setEditing(true)}
              >
                <Pencil strokeWidth={1.5} fill="none" />
              </Button>
              {!managing ? (
                <Button
                  type="button"
                  variant="subtle"
                  className="h-9 min-w-9 rounded-lg px-2 gap-1.5 shadow-none max-w-full [&_svg]:size-3.5"
                  disabled={!dish.listed || pending !== null || tagPending}
                  aria-label={t`添加 ${dish.name}，已选 ${quantity} 件`}
                  onClick={() => onAdd?.(dish)}
                >
                  {quantity > 0 ? (
                    <span
                      className="text-xs tabular-nums min-w-0 truncate"
                      title={String(quantity)}
                    >
                      {quantity}
                    </span>
                  ) : null}
                  <Plus data-icon="inline-end" />
                </Button>
              ) : null}
            </>
          )
        }
      />
    ) : null;

  const summary = renderSummary(false);

  const actions = (
    <div
      className={cls`col-span-2 flex min-w-0 items-center justify-between gap-2 flex-wrap ${isNew ? "pt-1" : ""}`}
    >
      <div className="flex min-h-9 justify-start items-center gap-2 min-w-0 max-w-full">
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
      <div className="flex min-h-9 items-center justify-end gap-1.5 min-w-0 max-w-full ms-auto">
        <Button
          type="button"
          variant="default"
          className="px-3 min-h-9 min-w-0 rounded-lg shadow-none hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0 whitespace-normal h-auto py-1.5 text-xs max-w-full"
          onClick={() => void commit()}
        >
          {pending === "save" ? (
            <LoaderCircle
              className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Save className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0 wrap-anywhere">
            {pending === "save" ? t`保存中…` : isNew ? t`添加项目` : t`完成`}
          </span>
        </Button>
      </div>
    </div>
  );

  const form = (
    <fieldset
      disabled={pending !== null || tagPending}
      aria-busy={pending !== null || tagPending}
      className={`${dishGridCls} ${isNew ? "" : dishRowCls}`}
    >
      <label className={`col-span-2 ${dishFieldCls}`}>
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
      <div className={`col-span-2 ${dishFieldCls}`}>
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
      <label className={dishFieldCls}>
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
      <label className={dishFieldCls}>
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
      <label className={dishFieldCls}>
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
      <label className={dishFieldCls}>
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
      {isNew ? actions : null}
      {error ? (
        <p
          className="col-span-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );

  if (!dish) return form;
  if (selection) {
    return (
      <ExpandingItemEditor
        expanded={editing}
        summary={summary}
        expandedSummary={renderSummary(true)}
        footer={
          <fieldset disabled={pending !== null || tagPending}>
            {actions}
          </fieldset>
        }
      >
        {form}
      </ExpandingItemEditor>
    );
  }
  return editing ? (
    <>
      {renderSummary(true)}
      {form}
      <fieldset disabled={pending !== null || tagPending}>{actions}</fieldset>
    </>
  ) : (
    summary
  );
}

function parseSort(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
