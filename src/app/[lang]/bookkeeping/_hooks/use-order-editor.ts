import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { bbqStore } from "@/lib/bbq/idb-store";
import { lineCents, totalCents } from "@/lib/bbq/money";
import { createOrderPhoto, MAX_ORDER_PHOTOS } from "@/lib/bbq/order-photo";
import {
  getDishTagIds,
  getLineTags,
  matchesTag,
  resolveTagFilter,
} from "@/lib/bbq/tags";
import type {
  Dish,
  ItemTag,
  Order,
  OrderPhoto,
  OrderStatus,
} from "@/lib/bbq/types";
import { bookkeepingPath } from "@/lib/bookkeeping-pwa/routes";
import { errorMessage } from "../_lib/errors";
import { MENU_CHANGED_EVENT, notifyMenuChanged } from "../_lib/menu-events";
import { useGroupingSettings } from "./use-grouping-settings";
import { useNavigate } from "./use-navigate";

export type DraftLine = {
  key: string;
  tags?: ItemTag[];
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  caloriesKcal?: number | null;
  unit: string;
  quantity: number;
};

async function readMenu() {
  const [dishes, tags] = await Promise.all([
    bbqStore.listDishes(),
    bbqStore.listTags(),
  ]);
  return { dishes, tags };
}

export function useOrderEditor(orderId?: string) {
  const { i18n, t } = useLingui();
  const navigate = useNavigate();
  const [tags, setTags] = useState<ItemTag[]>([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const { settings: groupingSettings, error: groupingError } =
    useGroupingSettings();
  const groupingEnabled = groupingSettings?.enabled ?? false;
  const [groupName, setGroupName] = useState<string | null | undefined>(null);
  const groupOptions = [
    ...new Set([
      ...(groupingSettings?.names ?? []),
      ...(groupName ? [groupName] : []),
    ]),
  ];
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing" | "error">(
    orderId ? "loading" : "ready",
  );
  const [menuRevision, setMenuRevision] = useState(0);
  const [menuPhase, setMenuPhase] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [menuError, setMenuError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const existing = await bbqStore.getOrder(orderId);
        if (cancelled) return;
        if (orderId && !existing) {
          setPhase("missing");
          return;
        }
        if (existing) {
          setOrder(existing);
          setGroupName(
            existing.groupingEnabled === false ? null : existing.groupName,
          );
          setDone(existing.status === "done");
          setPhotos(existing.photos);
          setLines(
            existing.lines.map((line) => ({
              key: line.id,
              tags: getLineTags(line),
              id: line.id,
              dishId: line.dishId,
              name: line.name,
              priceCents: line.priceCents,
              caloriesKcal: line.caloriesKcal,
              unit: line.unit,
              quantity: line.quantity,
            })),
          );
        }
        setPhase("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(errorMessage(i18n, error));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, i18n]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: menuRevision explicitly refreshes the menu after retries and item changes.
  useEffect(() => {
    let cancelled = false;
    // 保存项目后后台刷新，避免卸载正在填写的项目表单。
    setMenuPhase((current) => (current === "ready" ? current : "loading"));
    setMenuError(null);
    void readMenu()
      .then((menu) => {
        if (cancelled) return;
        setDishes(menu.dishes);
        setTags(menu.tags);
        setMenuPhase("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMenuError(errorMessage(i18n, error));
        setMenuPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [menuRevision, i18n]);

  useEffect(() => {
    const refreshMenu = () => setMenuRevision((revision) => revision + 1);
    window.addEventListener(MENU_CHANGED_EVENT, refreshMenu);
    return () => {
      window.removeEventListener(MENU_CHANGED_EVENT, refreshMenu);
    };
  }, []);

  async function reloadTags() {
    setTags(await bbqStore.listTags());
  }

  async function handleItemSaved() {
    setMessage(null);
    notifyMenuChanged();
  }

  const activeTagFilter = resolveTagFilter(tags, tagFilter);
  const availableDishes = dishes.filter((dish) => dish.listed);

  const filteredDishes = dishes.filter(
    (dish) =>
      dish.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      matchesTag(dish, activeTagFilter),
  );
  const selectedQuantities = new Map<string, number>();
  for (const line of lines) {
    if (line.dishId)
      selectedQuantities.set(
        line.dishId,
        (selectedQuantities.get(line.dishId) ?? 0) + line.quantity,
      );
  }

  const total = totalCents(
    lines.map((line) => ({
      lineCents: lineCents(line.priceCents, line.quantity),
    })),
  );
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
  const canSave =
    lines.length > 0 &&
    !saving &&
    !processingPhotos &&
    groupingSettings !== null &&
    !groupingError;

  function addDish(dish: Dish) {
    setLines((current) => {
      const index = current.findIndex((line) => line.dishId === dish.id);
      if (index === -1) {
        return [
          ...current,
          {
            key: `new:${dish.id}`,
            tags: tags.filter((tag) => getDishTagIds(dish).includes(tag.id)),
            dishId: dish.id,
            name: dish.name,
            priceCents: dish.priceCents,
            caloriesKcal: dish.caloriesKcal,
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

  async function addPhotos(files: FileList | null) {
    if (!files || processingPhotos) return;
    const selectedFiles = Array.from(files);
    const remaining = MAX_ORDER_PHOTOS - photos.length;
    if (remaining <= 0) {
      setMessage(t`每条记录最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
      return;
    }

    setProcessingPhotos(true);
    setMessage(null);
    try {
      const results = await Promise.allSettled(
        selectedFiles.slice(0, remaining).map(createOrderPhoto),
      );
      const nextPhotos = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      setPhotos((current) => [...current, ...nextPhotos]);

      if (results.some((result) => result.status === "rejected")) {
        setMessage(t`部分照片读取失败，请选择浏览器可读取的图片`);
      } else if (selectedFiles.length > remaining) {
        setMessage(t`每条记录最多留存 ${MAX_ORDER_PHOTOS} 张照片`);
      }
    } finally {
      setProcessingPhotos(false);
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    const status: OrderStatus = done ? "done" : "open";
    try {
      const saved = await bbqStore.saveOrder({
        id: order?.id,
        // 关闭全局分组只隐藏选择器；编辑旧记录时保留其历史分组。
        ...(groupingEnabled
          ? { groupingEnabled: true, groupName }
          : order
            ? {}
            : { groupingEnabled: false, groupName: null }),
        seat:
          groupingEnabled && groupName !== undefined
            ? null
            : (order?.seat ?? null),
        status,
        photos,
        lines: lines.map((line) => ({
          id: line.id,
          dishId: line.dishId,
          name: line.name,
          priceCents: line.priceCents,
          caloriesKcal: line.caloriesKcal,
          unit: line.unit,
          quantity: line.quantity,
        })),
      });
      navigate(bookkeepingPath("", { day: saved.businessDayKey }));
    } catch (error) {
      setMessage(errorMessage(i18n, error));
      setSaving(false);
    }
  }

  async function removeOrder() {
    if (!order || saving) return;
    if (!window.confirm(t`删除这条记录？`)) return;
    setSaving(true);
    try {
      await bbqStore.deleteOrder(order.id);
      navigate(bookkeepingPath("", { day: order.businessDayKey }));
    } catch (error) {
      setMessage(errorMessage(i18n, error));
      setSaving(false);
    }
  }

  return {
    order,
    groupingSettings,
    groupingError,
    groupingEnabled,
    groupName,
    groupOptions,
    setGroupName,
    done,
    lines,
    photos,
    phase,
    message,
    saving,
    processingPhotos,
    tags,
    setTags,
    dishes,
    menuPhase,
    menuError,
    setMenuRevision,
    setMessage,
    search,
    setSearch,
    activeTagFilter,
    setTagFilter,
    availableDishes,
    filteredDishes,
    selectedQuantities,
    total,
    itemCount,
    canSave,
    reloadTags,
    handleItemSaved,
    addDish,
    changeQuantity,
    addPhotos,
    removePhoto,
    save,
    removeOrder,
  };
}
