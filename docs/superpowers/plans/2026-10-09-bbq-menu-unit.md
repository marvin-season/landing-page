# BBQ Menu Unit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BBQ dishes require a price and unit, show saved dishes as a compact menu list, and preserve the unit snapshot on orders.

**Architecture:** Add `unit` to the dish and order-line domain types, validate it in pure document functions, and copy it into new order lines alongside the name and price. Normalize pre-unit IndexedDB records to `"份"` at the storage boundary. Keep menu editing route-local: saved dishes render as compact rows and expand into the existing form only while editing.

**Tech Stack:** TypeScript, React 19, Next.js 16 App Router, Dexie, Tailwind CSS 4, `node:test`.

## Global Constraints

- Data remains browser-only in IndexedDB; only `src/lib/bbq/idb-store.ts` may import Dexie.
- Money remains integer cents and quantities remain positive integers.
- UI copy remains hard-coded Chinese and does not use Lingui.
- Keep route-only UI in `src/app/[lang]/admin/bbq/_components`.
- Use Tailwind CSS only and do not reorder existing class names.
- Do not add payment, printing, inventory, discounts, notes, customer ordering, or server persistence.
- Run `node --import tsx --test src/lib/bbq/*.test.ts` and `nr check`; do not run `nr build`.
- Do not create commits unless the user explicitly asks.

---

### Task 1: Add unit to the domain and order snapshots

**Files:**
- Modify: `src/lib/bbq/types.ts`
- Modify: `src/lib/bbq/document.ts`
- Modify: `src/lib/bbq/document.test.ts`

**Interfaces:**
- Consumes: existing `requireName`, `saveDish`, `saveOrder`, and backup parsing.
- Produces: `Dish.unit: string`, `OrderLine.unit: string`, `SaveDishInput.unit: string`, and `SaveOrderLineInput.unit: string`.

- [ ] **Step 1: Add failing unit validation and snapshot tests**

Add tests that:

```ts
assert.throws(
  () =>
    saveDish(document, {
      categoryId: category.id,
      name: "羊肉串",
      priceCents: 300,
      unit: " ",
      sort: 0,
      listed: true,
    }, ids.next),
  (error: unknown) =>
    error instanceof BbqStoreError && error.code === "invalid_name",
);

assert.equal(savedDish.unit, "串");
assert.equal(savedOrder.lines[0]?.unit, "串");
```

Then update the dish unit to `"把"` and assert the existing order line still contains `"串"` while a new order line contains `"把"`.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --import tsx --test src/lib/bbq/document.test.ts
```

Expected: FAIL because the domain types and saved records do not contain `unit`.

- [ ] **Step 3: Extend types and pure document behavior**

Add `unit: string` to:

```ts
export type Dish
export type OrderLine
export type SaveDishInput
export type SaveOrderLineInput
```

In `saveDish`, normalize the value with the existing non-empty string rule:

```ts
unit: requireName(input.unit),
```

In `saveOrder`, preserve an existing line unchanged except for quantity, and create a new line from the current dish:

```ts
return {
  id: clock.createId(),
  dishId: dish.id,
  name: dish.name,
  priceCents: dish.priceCents,
  unit: dish.unit,
  quantity,
  lineCents: lineCents(dish.priceCents, quantity),
};
```

Update backup parsing so dishes and lines require a trimmed, non-empty `unit`:

```ts
unit: requireBackupName(value.unit),
```

- [ ] **Step 4: Update all existing test fixtures**

Add meaningful units such as `"串"`, `"份"`, or `"瓶"` to every dish and order-line fixture in `src/lib/bbq/document.test.ts`. Add a malformed backup case with a missing unit and assert `invalid_backup`.

- [ ] **Step 5: Run the focused test**

Run:

```bash
node --import tsx --test src/lib/bbq/document.test.ts
```

Expected: PASS.

---

### Task 2: Normalize legacy browser data

**Files:**
- Modify: `src/lib/bbq/idb-store.ts`

**Interfaces:**
- Consumes: raw Dexie category, dish, and order records.
- Produces: a valid `BbqDocument` where every dish and order line has a non-empty unit.

- [ ] **Step 1: Add boundary-only legacy shapes**

Define storage read shapes without weakening public domain types:

```ts
type StoredDish = Omit<Dish, "unit"> & { unit?: string };
type StoredOrder = Omit<Order, "lines"> & {
  lines: Array<Omit<Order["lines"][number], "unit"> & { unit?: string }>;
};
```

Use these types only for Dexie reads.

- [ ] **Step 2: Normalize records in `readDocument`**

Map old records before returning the document:

```ts
const dishes = storedDishes.map((dish) => ({
  ...dish,
  unit: dish.unit?.trim() || "份",
}));
const orders = storedOrders.map((order) => ({
  ...order,
  lines: order.lines.map((line) => ({
    ...line,
    unit: line.unit?.trim() || "份",
  })),
}));
```

Keep all writes using the strict current `Dish` and `Order` types. No database clear or destructive migration is needed.

- [ ] **Step 3: Type-check this boundary through project checks**

Run:

```bash
nr check
```

Expected: no type or Biome errors from `src/lib/bbq/idb-store.ts`.

---

### Task 3: Replace always-open dish forms with compact list rows

**Files:**
- Modify: `src/app/[lang]/admin/bbq/_components/menu-editor.tsx`

**Interfaces:**
- Consumes: `Dish.unit`, `formatYuan`, and the existing `bbqStore.saveDish`.
- Produces: compact saved-dish rows displaying `¥price/unit`; clicking a row opens its editor.

- [ ] **Step 1: Add unit to new and existing dish form state**

For new dishes:

```ts
const [unit, setUnit] = useState("");
```

Pass `unit` to `saveDish`, clear it after save, and add an input:

```tsx
<Field label="单位">
  <Input
    value={unit}
    onChange={(event) => onUnit(event.target.value)}
    className={inputCls}
    autoComplete="off"
    placeholder="串、份、瓶"
    required
  />
</Field>
```

For existing dishes initialize with `dish.unit` and include it in saves.

- [ ] **Step 2: Add compact list/edit state**

Add `editing` state to `DishCard`, defaulting to `false`. When not editing, render one button-like row containing:

```tsx
<span className="truncate">{dish.name}</span>
<span className="tabular-nums">
  {formatYuan(dish.priceCents)}/{dish.unit}
</span>
<span>{dish.listed ? "已上架" : "未上架"}</span>
```

Clicking the row sets `editing` to `true`. The expanded form keeps name, price, unit, sort, and listed fields, with “保存菜品” and “取消” actions. After a successful save, call `onSaved()` and collapse the editor.

- [ ] **Step 3: Keep category listing semantics unchanged**

Continue saving category and dish `listed` independently. Do not mutate child dishes when a category is unlisted; the order menu already filters out dishes whose category is unlisted.

- [ ] **Step 4: Check the menu component**

Run:

```bash
nr check
```

Expected: no Biome, React, or TypeScript errors in `menu-editor.tsx`.

---

### Task 4: Show and preserve units in order editing

**Files:**
- Modify: `src/app/[lang]/admin/bbq/_components/order-editor.tsx`

**Interfaces:**
- Consumes: `Dish.unit` and `OrderLine.unit`.
- Produces: draft lines carrying units and order UI displaying `¥price/unit`.

- [ ] **Step 1: Extend the draft line**

Add:

```ts
unit: string;
```

Populate it from existing lines and newly selected dishes. Include it in `saveOrder` inputs even though the store replaces new-line snapshots from the current dish.

- [ ] **Step 2: Display the unit in the menu and order detail**

Change dish and line price displays to:

```tsx
{formatYuan(dish.priceCents)}/{dish.unit}
```

and:

```tsx
{formatYuan(line.priceCents)}/{line.unit}
```

Do not change total calculations: quantity still multiplies the per-unit price in integer cents.

- [ ] **Step 3: Run project checks**

Run:

```bash
nr check
```

Expected: no errors.

---

### Task 5: Full verification

**Files:**
- Verify: `src/lib/bbq/*.test.ts`
- Verify: all modified BBQ files

**Interfaces:**
- Consumes: completed tasks 1–4.
- Produces: verified feature ready for manual UI review.

- [ ] **Step 1: Run all BBQ unit tests**

Run:

```bash
node --import tsx --test src/lib/bbq/*.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run repository checks**

Run:

```bash
nr check
```

Expected: command exits successfully.

- [ ] **Step 3: Review the final diff**

Confirm the diff contains only the BBQ unit/list requirements and their design/plan documentation. Confirm no lockfile, locale, backend, or unrelated UI changes were introduced.

- [ ] **Step 4: Hand off manual UI checks**

Ask the user to verify:

1. A dish cannot be saved without a unit.
2. Saving an online dish collapses it into a row showing `¥price/unit`.
3. Clicking the row reopens editing.
4. The order menu and selected order lines show the unit.
5. Changing a dish unit does not alter existing order lines.
