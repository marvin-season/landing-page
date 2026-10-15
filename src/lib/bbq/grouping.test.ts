import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyDocument,
  exportBackup,
  mergeBackup,
  saveOrder,
} from "./document";
import {
  groupNameLength,
  requireGroupingSettings,
  requireGroupName,
} from "./grouping";
import { BbqStoreError } from "./store";

const clock = {
  now: new Date("2026-10-15T02:00:00.000Z"),
  createId: () => "order",
};
const input = { seat: null, status: "open" as const, lines: [] };

describe("custom grouping", () => {
  it("accepts arbitrary scripts, punctuation, spaces and ten visible characters", () => {
    for (const name of [
      "自定义餐桌A-1",
      "家人 / 朋友",
      "<>'&😊",
      "👨‍👩‍👧‍👦".repeat(10),
      "e\u0301".repeat(10),
    ]) {
      assert.equal(requireGroupName(name), name);
      assert.ok(groupNameLength(name) <= 10);
    }
    assert.equal(groupNameLength("👨‍👩‍👧‍👦"), 1);
    assert.equal(requireGroupName("  一组  "), "一组");
  });

  it("rejects blank or overlong names and invalid settings", () => {
    for (const name of ["", "  ", "字".repeat(11), "😊".repeat(11), 123]) {
      assert.throws(
        () => requireGroupName(name),
        (error) =>
          error instanceof BbqStoreError && error.code === "invalid_group_name",
      );
    }
    assert.throws(() => requireGroupingSettings({ enabled: "yes", names: [] }));
    assert.throws(() =>
      requireGroupingSettings({ enabled: true, names: ["组", " 组 "] }),
    );
    assert.deepEqual(requireGroupingSettings({ enabled: false, names: [] }), {
      enabled: false,
      names: [],
    });
  });

  it("saves a name snapshot and preserves it when settings are disabled or names removed", () => {
    const saved = saveOrder(
      emptyDocument(),
      { ...input, groupingEnabled: true, groupName: "家庭😊" },
      clock,
    );
    assert.equal(saved.order.groupName, "家庭😊");
    assert.equal(saved.order.seat, null);
    const document = {
      ...saved.document,
      groupingSettings: { enabled: false, names: [] },
    };
    const edited = saveOrder(
      document,
      { ...input, id: saved.order.id, status: "done" },
      clock,
    );
    assert.equal(edited.order.groupName, "家庭😊");
    assert.equal(edited.order.groupingEnabled, true);
    const ungrouped = saveOrder(
      document,
      { ...input, id: saved.order.id, groupingEnabled: true, groupName: null },
      clock,
    );
    assert.equal(ungrouped.order.groupName, null);
    const disabled = saveOrder(
      emptyDocument(),
      { ...input, groupingEnabled: false, groupName: "家庭😊" },
      clock,
    );
    assert.equal(disabled.order.groupName, null);
  });

  it("preserves legacy seats until the user chooses a custom group", () => {
    const legacy = saveOrder(
      emptyDocument(),
      { ...input, groupingEnabled: true, seat: 3 },
      clock,
    );
    assert.equal(legacy.order.groupName, undefined);
    assert.equal(legacy.order.seat, 3);
    const changed = saveOrder(
      legacy.document,
      {
        ...input,
        id: legacy.order.id,
        groupingEnabled: true,
        groupName: "露台",
      },
      clock,
    );
    assert.equal(changed.order.groupName, "露台");
    assert.equal(changed.order.seat, null);
  });

  it("round-trips settings and snapshots and keeps settings when importing old backups", () => {
    const saved = saveOrder(
      emptyDocument(),
      { ...input, groupingEnabled: true, groupName: "外出" },
      clock,
    );
    const document = {
      ...saved.document,
      groupingSettings: { enabled: true, names: ["外出", "家"] },
    };
    const backup = exportBackup(document);
    const restored = mergeBackup(emptyDocument(), backup);
    assert.deepEqual(restored.groupingSettings, document.groupingSettings);
    assert.equal(restored.orders[0].groupName, "外出");
    const old = exportBackup(emptyDocument());
    assert.deepEqual(
      mergeBackup(document, old).groupingSettings,
      document.groupingSettings,
    );
    const combined = mergeBackup(
      {
        ...emptyDocument(),
        groupingSettings: { enabled: false, names: ["同事"] },
      },
      backup,
    );
    assert.deepEqual(combined.groupingSettings, {
      enabled: true,
      names: ["同事", "外出", "家"],
    });
    for (const invalid of [
      {
        ...backup,
        groupingSettings: { enabled: true, names: ["字".repeat(11)] },
      },
      { ...backup, orders: [{ ...saved.order, groupName: "字".repeat(11) }] },
    ])
      assert.throws(
        () => mergeBackup(emptyDocument(), invalid),
        (error) =>
          error instanceof BbqStoreError && error.code === "invalid_backup",
      );
  });
});
