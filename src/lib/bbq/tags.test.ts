import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addTag,
  deleteDish,
  deleteOrder,
  deleteTag,
  emptyDocument,
  exportBackup,
  listDishes,
  listTags,
  mergeBackup,
  saveCategory,
  saveDish,
  saveOrder,
} from "./document";
import {
  DEFAULT_TAG,
  getDishTagIds,
  getLineTags,
  matchesTag,
  resolveTagFilter,
} from "./tags";
import type { Dish } from "./types";

function setup() {
  let id = 0;
  const createId = () => `id-${++id}`;
  const { document, category } = saveCategory(
    emptyDocument(),
    { name: "菜单", sort: 0, listed: true },
    createId,
  );
  const input = {
    categoryId: category.id,
    name: "咖啡",
    priceCents: 1000,
    unit: "杯",
    sort: 0,
    listed: true,
  };
  const clock = { createId, now: new Date("2026-10-14T08:00:00Z") };
  return { document, createId, input, clock };
}

function orderInput(dish: Dish) {
  return {
    seat: null,
    status: "done" as const,
    lines: [
      {
        dishId: dish.id,
        name: dish.name,
        priceCents: dish.priceCents,
        unit: dish.unit,
        quantity: 1,
      },
    ],
  };
}

describe("item tags", () => {
  it("assigns one shared default tag to new items with omitted or empty tags", () => {
    const { document, input, createId } = setup();
    const first = saveDish(document, input, createId);
    const second = saveDish(first.document, { ...input, tagId: "" }, createId);
    const third = saveDish(
      second.document,
      { ...input, tagId: null },
      createId,
    );
    assert.deepEqual(getDishTagIds(first.dish), [DEFAULT_TAG.id]);
    assert.deepEqual(getDishTagIds(second.dish), [DEFAULT_TAG.id]);
    assert.deepEqual(getDishTagIds(third.dish), [DEFAULT_TAG.id]);
    assert.deepEqual(listTags(third.document), [DEFAULT_TAG]);
    assert.equal(document.tags, undefined);
  });

  it("preserves untagged legacy items and records through edits and backup restore", () => {
    const { document, input, createId, clock } = setup();
    const legacy = { ...document, dishes: [{ ...input, id: "legacy" }] };
    const saved = saveDish(
      legacy,
      { ...input, id: "legacy", priceCents: 2000 },
      createId,
    );
    assert.deepEqual(getDishTagIds(saved.dish), []);
    assert.deepEqual(getDishTagIds(listDishes(legacy)[0]), []);
    const recorded = saveOrder(saved.document, orderInput(saved.dish), clock);
    assert.deepEqual(getLineTags(recorded.order.lines[0]), []);
    const backup = exportBackup(recorded.document);
    delete backup.tags;
    const restored = mergeBackup(emptyDocument(), backup);
    assert.deepEqual(getDishTagIds(restored.dishes[0]), []);
    assert.deepEqual(getLineTags(restored.orders[0].lines[0]), []);
    const edited = saveOrder(
      restored,
      {
        ...orderInput(saved.dish),
        id: recorded.order.id,
        lines: [{ ...recorded.order.lines[0], quantity: 2 }],
      },
      clock,
    );
    assert.deepEqual(getLineTags(edited.order.lines[0]), []);
  });

  it("adds trimmed tags, rejects empty and duplicate names, and deletes unused tags", () => {
    const { document, createId } = setup();
    const saved = addTag(document, "  Work  ", createId);
    assert.equal(saved.tag.name, "Work");
    assert.throws(() => addTag(saved.document, "work", createId), {
      code: "tag_exists",
    });
    assert.throws(() => addTag(saved.document, "  ", createId), {
      code: "invalid_name",
    });
    assert.deepEqual(listTags(deleteTag(saved.document, saved.tag.id)), []);
    assert.throws(() => deleteTag(saved.document, "missing"), {
      code: "tag_not_found",
    });
  });

  it("blocks deletion when a disabled item uses the tag", () => {
    const { document, createId, input } = setup();
    const tagged = addTag(document, "饮品", createId);
    const saved = saveDish(
      tagged.document,
      { ...input, tagId: tagged.tag.id, listed: false },
      createId,
    );
    assert.throws(() => deleteTag(saved.document, tagged.tag.id), {
      code: "tag_in_use",
    });
    const removed = deleteDish(saved.document, saved.dish.id);
    assert.deepEqual(listTags(deleteTag(removed, tagged.tag.id)), []);
  });

  it("keeps historical tag snapshots and blocks deletion until references are removed", () => {
    const { document, createId, input, clock } = setup();
    const tagged = addTag(document, "饮品", createId);
    const saved = saveDish(
      tagged.document,
      { ...input, tagId: tagged.tag.id },
      createId,
    );
    const recorded = saveOrder(saved.document, orderInput(saved.dish), clock);
    const changed = saveDish(
      recorded.document,
      { ...saved.dish, tagIds: [] },
      createId,
    );
    assert.deepEqual(getDishTagIds(changed.dish), [DEFAULT_TAG.id]);
    assert.deepEqual(getLineTags(changed.document.orders[0].lines[0]), [
      tagged.tag,
    ]);
    const edited = saveOrder(
      changed.document,
      {
        ...orderInput(changed.dish),
        id: recorded.order.id,
        lines: [{ ...recorded.order.lines[0], quantity: 2 }],
      },
      clock,
    );
    assert.deepEqual(getLineTags(edited.order.lines[0]), [tagged.tag]);
    assert.throws(() => deleteTag(edited.document, tagged.tag.id), {
      code: "tag_in_use",
    });
    const removed = deleteOrder(edited.document, recorded.order.id);
    assert.ok(
      !listTags(deleteTag(removed, tagged.tag.id)).some(
        (tag) => tag.id === tagged.tag.id,
      ),
    );
  });

  it("round-trips tags and historical snapshots in backups", () => {
    const { document, createId, input, clock } = setup();
    const tagged = addTag(document, "运动", createId);
    const saved = saveDish(
      tagged.document,
      { ...input, tagId: tagged.tag.id },
      createId,
    );
    const recorded = saveOrder(saved.document, orderInput(saved.dish), clock);
    const restored = mergeBackup(
      emptyDocument(),
      JSON.parse(JSON.stringify(exportBackup(recorded.document))),
    );
    assert.deepEqual(restored.tags, [tagged.tag]);
    assert.deepEqual(getDishTagIds(restored.dishes[0]), [tagged.tag.id]);
    assert.deepEqual(getLineTags(restored.orders[0].lines[0]), [tagged.tag]);
  });

  it("rejects missing tag references and malformed backups", () => {
    const { document, createId, input, clock } = setup();
    assert.throws(
      () => saveDish(document, { ...input, tagId: "missing" }, createId),
      { code: "tag_not_found" },
    );
    const saved = saveDish(document, input, createId);
    const recorded = saveOrder(saved.document, orderInput(saved.dish), clock);
    const backup = exportBackup(recorded.document);
    for (const tags of [
      null,
      {},
      [],
      [DEFAULT_TAG, DEFAULT_TAG],
      [{ id: "default", name: "changed" }],
    ]) {
      assert.throws(() => mergeBackup(emptyDocument(), { ...backup, tags }), {
        code: "invalid_backup",
      });
    }
    assert.throws(
      () =>
        mergeBackup(emptyDocument(), {
          ...backup,
          dishes: [],
          orders: [
            {
              ...recorded.order,
              lines: [
                {
                  ...recorded.order.lines[0],
                  tags: [{ id: "missing", name: "丢失" }],
                },
              ],
            },
          ],
        }),
      { code: "invalid_backup" },
    );
  });

  it("can delete an unused default and recreate it for a later untagged new item", () => {
    const { document, createId, input } = setup();
    const saved = saveDish(document, input, createId);
    assert.throws(() => deleteTag(saved.document, DEFAULT_TAG.id), {
      code: "tag_in_use",
    });
    const removed = deleteTag(
      deleteDish(saved.document, saved.dish.id),
      DEFAULT_TAG.id,
    );
    assert.deepEqual(listTags(removed), []);
    assert.deepEqual(getDishTagIds(saveDish(removed, input, createId).dish), [
      DEFAULT_TAG.id,
    ]);
  });

  it("includes untagged legacy items in the default filter", () => {
    const dishes = [
      { tagId: undefined },
      { tagId: null },
      { tagId: "default" },
      { tagId: "custom" },
    ];
    assert.equal(dishes.filter((dish) => matchesTag(dish, "all")).length, 4);
    assert.deepEqual(
      dishes.filter((dish) => matchesTag(dish, "tag:default")),
      [dishes[0], dishes[1], dishes[2]],
    );
    assert.deepEqual(
      dishes.filter((dish) => matchesTag(dish, "tag:custom")),
      [dishes[3]],
    );
    assert.equal(matchesTag({ tagIds: [] }, "tag:default"), true);
    assert.equal(resolveTagFilter([], "tag:default"), "tag:default");
    assert.equal(resolveTagFilter([], "tag:deleted"), "all");
    assert.equal(resolveTagFilter([DEFAULT_TAG], "tag:default"), "tag:default");
  });
});

describe("multiple tags", () => {
  it("saves multiple selections, filters by either, and protects every historical reference", () => {
    const { document, createId, input, clock } = setup();
    const first = addTag(document, "饮品", createId);
    const second = addTag(first.document, "早餐", createId);
    const ids = [first.tag.id, second.tag.id];
    const saved = saveDish(
      second.document,
      { ...input, tagIds: [...ids, ids[0]] },
      createId,
    );
    assert.deepEqual(saved.dish.tagIds, ids);
    for (const id of ids) {
      assert.equal(matchesTag(saved.dish, `tag:${id}`), true);
      assert.throws(() => deleteTag(saved.document, id), {
        code: "tag_in_use",
      });
    }
    const recorded = saveOrder(saved.document, orderInput(saved.dish), clock);
    assert.deepEqual(getLineTags(recorded.order.lines[0]), [
      first.tag,
      second.tag,
    ]);
    const restored = mergeBackup(
      emptyDocument(),
      exportBackup(recorded.document),
    );
    assert.deepEqual(getDishTagIds(restored.dishes[0]), ids);
    assert.deepEqual(getLineTags(restored.orders[0].lines[0]), [
      first.tag,
      second.tag,
    ]);
    const removed = deleteDish(restored, saved.dish.id);
    for (const id of ids)
      assert.throws(() => deleteTag(removed, id), { code: "tag_in_use" });
    const cleared = saveDish(
      saved.document,
      { ...saved.dish, tagIds: [] },
      createId,
    );
    assert.deepEqual(getDishTagIds(cleared.dish), [DEFAULT_TAG.id]);
  });

  it("imports and edits old single-tag items and snapshots without losing associations", () => {
    const { document, createId, input, clock } = setup();
    const tagged = addTag(document, "饮品", createId);
    const legacyDish = { ...input, id: "old-dish", tagId: tagged.tag.id };
    const legacy = { ...tagged.document, dishes: [legacyDish] };
    const recorded = saveOrder(legacy, orderInput(legacyDish), clock);
    const backup = exportBackup(recorded.document);
    backup.dishes = [legacyDish];
    backup.orders[0].lines = [
      { ...recorded.order.lines[0], tags: undefined, tag: tagged.tag },
    ];
    const restored = mergeBackup(emptyDocument(), backup);
    assert.deepEqual(getDishTagIds(restored.dishes[0]), [tagged.tag.id]);
    assert.deepEqual(getLineTags(restored.orders[0].lines[0]), [tagged.tag]);
    const edited = saveDish(
      legacy,
      { ...input, id: legacyDish.id, priceCents: 1200 },
      createId,
    );
    assert.deepEqual(edited.dish.tagIds, [tagged.tag.id]);
  });

  it("rejects malformed arrays and missing references in multiple-tag backups", () => {
    const { document, createId, input, clock } = setup();
    const saved = saveDish(document, input, createId);
    const recorded = saveOrder(saved.document, orderInput(saved.dish), clock);
    const backup = exportBackup(recorded.document);
    for (const tagIds of [
      null,
      "default",
      [1],
      ["missing"],
      ["default", "default"],
    ]) {
      assert.throws(
        () =>
          mergeBackup(emptyDocument(), {
            ...backup,
            dishes: [{ ...saved.dish, tagIds }],
          }),
        { code: "invalid_backup" },
      );
    }
    for (const tags of [
      null,
      "default",
      [DEFAULT_TAG, DEFAULT_TAG],
      [{ id: "missing", name: "missing" }],
    ]) {
      assert.throws(
        () =>
          mergeBackup(emptyDocument(), {
            ...backup,
            orders: [
              {
                ...recorded.order,
                lines: [{ ...recorded.order.lines[0], tags }],
              },
            ],
          }),
        { code: "invalid_backup" },
      );
    }
  });
});
