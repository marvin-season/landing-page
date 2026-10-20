import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { bbqStore } from "@/lib/bbq/idb-store";
import type { Category, Dish, ItemTag } from "@/lib/bbq/types";
import { errorMessage } from "../_lib/errors";
import { notifyMenuChanged } from "../_lib/menu-events";

export function useMenuData(onTagsChanged?: (tags: ItemTag[]) => void) {
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
    notifyMenuChanged();
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
        setMessage(errorMessage(i18n, error));
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadRequest, reload, i18n]);

  return {
    menu,
    tags,
    dishes,
    phase,
    message,
    notice,
    listRequested,
    setMessage,
    setLoadRequest,
    setListRequested,
    reloadTags,
    handleSaved,
  };
}
