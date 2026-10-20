import { Button, Input, Switch } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ChevronDown,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bbqStore } from "@/lib/bbq/idb-store";
import { centsToYuanInput, parseYuanToCents } from "@/lib/bbq/money";
import { DEFAULT_TAG, getDishTagIds } from "@/lib/bbq/tags";
import type { Dish, ItemTag } from "@/lib/bbq/types";
import { bbqErrorMessage } from "../../_lib/bbq-errors";
import { cls } from "../../_styles/bbq-layout";
import {
  dishFieldCls,
  dishGridCls,
  dishInputCls,
  dishTagControlCls,
  fieldLabelCls,
  menuColorsCls,
} from "../../_styles/dish-form-styles";
import {
  ExpandingItemEditor,
  useItemEditSelection,
} from "../shared/item-edit-viewport";
import { DishItem } from "./dish-item";
import { ItemTagSelect } from "./item-tags";

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
            className="shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
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
          className="px-3 min-h-9 min-w-0 rounded-lg shadow-none hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0 whitespace-normal h-auto py-1.5 text-xs max-w-full focus-visible:ring-primary/50 shinchan:rounded-lg"
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
      className={`${dishGridCls} ${menuColorsCls}`}
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
          placeholder={t`项目名称`}
        />
      </label>
      <div className={`col-span-2 ${dishFieldCls}`}>
        <span className={fieldLabelCls}>
          <Trans>标签</Trans>
        </span>
        <ItemTagSelect
          inputClassName={dishInputCls}
          controlClassName={dishTagControlCls}
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
          placeholder="0"
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
