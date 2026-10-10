"use client";

import { Button, Input } from "@landing-page/design-system";
import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { centsToYuanInput, parseYuanToCents } from "@/lib/bbq/money";
import type { SaveOrderLineInput } from "@/lib/bbq/types";

export function ManualItemForm({
  initial,
  disabled,
  onSave,
  onCancel,
  onDirty,
}: {
  initial?: SaveOrderLineInput;
  disabled: boolean;
  onSave: (line: SaveOrderLineInput) => void;
  onCancel: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(
    initial ? centsToYuanInput(initial.priceCents) : "",
  );
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "件");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onChange={() => onDirty(true)}
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        const cents = parseYuanToCents(price);
        const count = Number(quantity);
        if (!name.trim()) {
          setError("请输入商品名称");
          return;
        }
        if (
          cents === null ||
          !Number.isSafeInteger(cents) ||
          !Number.isSafeInteger(count) ||
          count <= 0 ||
          !Number.isSafeInteger(cents * count)
        ) {
          setError("请输入有效的单价（最多两位小数）和正整数数量");
          return;
        }
        onSave({
          id: initial?.id,
          dishId: null,
          name: name.trim(),
          priceCents: cents,
          quantity: count,
          unit: unit.trim() || "件",
        });
        setName("");
        setPrice("");
        setQuantity("1");
        setUnit("件");
        setError(null);
        onDirty(false);
      }}
    >
      <div>
        <h2 className="text-sm font-medium text-foreground">
          {initial ? "修改商品" : "添加商品"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          手动填写商品信息，可连续添加多件商品
        </p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        商品名称
        <Input
          value={name}
          disabled={disabled}
          placeholder="例如：午餐、水果、日用品"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          单价（元）
          <Input
            inputMode="decimal"
            value={price}
            disabled={disabled}
            placeholder="0.00"
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          数量
          <Input
            inputMode="numeric"
            value={quantity}
            disabled={disabled}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        单位（选填）
        <Input
          value={unit}
          disabled={disabled}
          placeholder="件、份、次…"
          onChange={(event) => setUnit(event.target.value)}
        />
      </label>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={disabled}>
          {initial ? (
            <Save className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {initial ? "保存商品" : "添加到订单"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setName("");
            setPrice("");
            setQuantity("1");
            setUnit("件");
            setError(null);
            onDirty(false);
            onCancel();
          }}
        >
          {initial ? "取消修改" : "清空"}
        </Button>
      </div>
    </form>
  );
}
