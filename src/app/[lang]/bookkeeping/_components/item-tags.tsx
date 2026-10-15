"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tag,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown, Plus, Save, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { bbqStore } from "@/lib/bbq/idb-store";
import { DEFAULT_TAG } from "@/lib/bbq/tags";
import type { ItemTag } from "@/lib/bbq/types";
import { bbqErrorMessage } from "./bbq-errors";
import { notifyBbqMenuChanged } from "./bbq-menu-events";

export function ItemTagBadge({ tag }: { tag?: ItemTag | null }) {
  const { t } = useLingui();
  if (!tag) return null;
  return (
    <Tag
      data-slot="item-tag"
      size="compact"
      className="max-w-full truncate"
      title={tag.name}
    >
      {tag.id === DEFAULT_TAG.id ? t`默认` : tag.name}
    </Tag>
  );
}

export function ItemTagSelect({
  tags,
  value,
  onChange,
  onTagsChanged,
  onPendingChange,
  disabled,
}: {
  tags: ItemTag[];
  value: string[];
  onChange: (ids: string[]) => void;
  onTagsChanged: () => Promise<void>;
  onPendingChange: (pending: boolean) => void;
  disabled?: boolean;
}) {
  const { i18n, t } = useLingui();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const selectedIds = value.length ? value : [DEFAULT_TAG.id];
  const options = tags.some((tag) => tag.id === DEFAULT_TAG.id)
    ? tags
    : [DEFAULT_TAG, ...tags];

  async function add() {
    if (busy.current || disabled || !name.trim()) return;
    busy.current = true;
    setPending(true);
    onPendingChange(true);
    setError(null);
    try {
      const tag = await bbqStore.addTag(name);
      await onTagsChanged();
      onChange([...value.filter((id) => id !== DEFAULT_TAG.id), tag.id]);
      setName("");
      setAdding(false);
      notifyBbqMenuChanged();
    } catch (error) {
      setError(bbqErrorMessage(i18n, error));
    } finally {
      busy.current = false;
      setPending(false);
      onPendingChange(false);
    }
  }

  async function remove(tag: ItemTag) {
    if (busy.current || disabled) return;
    busy.current = true;
    setPending(true);
    onPendingChange(true);
    setError(null);
    try {
      await bbqStore.deleteTag(tag.id);
      await onTagsChanged();
      onChange(value.filter((id) => id !== tag.id));
      notifyBbqMenuChanged();
    } catch (error) {
      setError(bbqErrorMessage(i18n, error));
    } finally {
      busy.current = false;
      setPending(false);
      onPendingChange(false);
    }
  }

  function toggle(id: string, checked: boolean) {
    if (!checked) onChange(value.filter((selected) => selected !== id));
    else if (id === DEFAULT_TAG.id) onChange([id]);
    else
      onChange([
        ...value.filter((selected) => selected !== DEFAULT_TAG.id),
        id,
      ]);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {options
            .filter((tag) => selectedIds.includes(tag.id))
            .map((tag) => (
              <ItemTagBadge key={tag.id} tag={tag} />
            ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || pending}
              className="h-9 shrink-0 gap-1 px-2 text-xs"
              aria-label={t`项目标签`}
            >
              <Trans>选择标签</Trans>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 w-64">
            <DropdownMenuGroup>
              {options.map((tag) => (
                <div key={tag.id} className="flex min-w-0 items-center gap-1">
                  <DropdownMenuCheckboxItem
                    checked={selectedIds.includes(tag.id)}
                    disabled={disabled || pending}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) => toggle(tag.id, checked)}
                    className="min-h-9 min-w-0 flex-1"
                  >
                    <span className="truncate">
                      {tag.id === DEFAULT_TAG.id ? t`默认` : tag.name}
                    </span>
                  </DropdownMenuCheckboxItem>
                  {tags.some((saved) => saved.id === tag.id) ? (
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={disabled || pending}
                      aria-label={t`删除标签 ${tag.name}`}
                      onSelect={() => void remove(tag)}
                      className="size-9 shrink-0 justify-center"
                    >
                      <Trash2 />
                    </DropdownMenuItem>
                  ) : null}
                </div>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label={t`添加标签`}
          aria-expanded={adding}
          disabled={disabled || pending}
          onClick={() => {
            setAdding(!adding);
            setError(null);
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {adding ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t`标签名称`}
            aria-label={t`标签名称`}
            disabled={disabled || pending}
            className="h-9 min-w-0 flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void add();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled || pending || !name.trim()}
            aria-label={t`添加标签`}
            onClick={() => void add()}
            className="size-9 shrink-0"
          >
            <Save className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={t`取消`}
            onClick={() => {
              setAdding(false);
              setName("");
              setError(null);
            }}
            className="size-9 shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ItemTagFilter({
  tags,
  value,
  onChange,
}: {
  tags: ItemTag[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLingui();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-11 w-30 min-w-0 max-w-[45%] shrink-0 px-3 text-sm [&>span]:truncate data-[size=default]:h-11 rounded-lg bg-background border-border/60 shadow-none shinchan:bg-card/80 apple:rounded-xl apple:bg-card/70 apple:backdrop-blur-xl"
        aria-label={t`按标签筛选`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">
            <Trans>全部标签</Trans>
          </SelectItem>
          <SelectItem value={`tag:${DEFAULT_TAG.id}`}>
            <Trans>默认</Trans>
          </SelectItem>
          {tags
            .filter((tag) => tag.id !== DEFAULT_TAG.id)
            .map((tag) => (
              <SelectItem key={tag.id} value={`tag:${tag.id}`}>
                {tag.name}
              </SelectItem>
            ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
