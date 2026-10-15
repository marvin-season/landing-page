import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  companionMoods,
  imageBlob,
  parseCompanionAlbum,
} from "./companion-album";
import {
  companionImages,
  replaceCompanionAlbum,
  type StoredCompanion,
  saveCompanion,
} from "./companion-album-store";

const gif =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const album = {
  format: "luji-companions",
  version: 1,
  images: { hello: { src: gif } },
};
function row(id: StoredCompanion["id"] = "hello"): StoredCompanion {
  return {
    id,
    image: imageBlob(gif),
    still: new Blob(["still"], { type: "image/png" }),
    width: 1,
    height: 1,
  };
}
beforeEach(() => companionImages.clear());

test("a partial album preserves GIF bytes and has no built-in fallbacks", async () => {
  const parsed = parseCompanionAlbum(JSON.stringify(album));
  assert.equal(parsed.images.wave, undefined);
  const blob = imageBlob(parsed.images.hello!.src);
  assert.equal(blob.type, "image/gif");
  assert.equal(
    Buffer.from(await blob.arrayBuffer()).toString("base64"),
    gif.split(",")[1],
  );
});

test("rejects ledger backups, unknown slots, remote URLs, SVG and empty albums", () => {
  for (const value of [
    { version: 1, orders: [] },
    { ...album, version: 2 },
    { ...album, images: {} },
    { ...album, images: { unknown: { src: gif } } },
    { ...album, images: { hello: { src: "https://example.com/a.gif" } } },
    {
      ...album,
      images: { hello: { src: "data:image/svg+xml;base64,PHN2Zz4=" } },
    },
  ])
    assert.throws(() => parseCompanionAlbum(JSON.stringify(value)));
});

test("replace removes absent slots; updating one scene preserves the others", async () => {
  await replaceCompanionAlbum([row(), row("wave")]);
  await saveCompanion({ ...row(), width: 2 });
  assert.equal((await companionImages.get("hello"))?.width, 2);
  assert.ok(await companionImages.get("wave"));
  await replaceCompanionAlbum([row("dance")]);
  assert.equal(await companionImages.get("hello"), undefined);
  assert.deepEqual(
    (await companionImages.toArray()).map((entry) => entry.id),
    ["dance"],
  );
});

test("a failed database write rolls back the entire album replacement", async () => {
  await replaceCompanionAlbum([row()]);
  const invalid = { ...row("wave"), uncloneable: () => {} };
  await assert.rejects(replaceCompanionAlbum([row("dance"), invalid]));
  assert.deepEqual(
    (await companionImages.toArray()).map((entry) => entry.id),
    ["hello"],
  );
});

test("oversized replacement keeps the existing album exportable and intact", async () => {
  await replaceCompanionAlbum([row()]);
  const blob = new Blob([new Uint8Array(6 * 1024 * 1024)]);
  await assert.rejects(
    replaceCompanionAlbum(
      companionMoods.map((id) => ({ ...row(id), image: blob, still: blob })),
    ),
    /album-size/,
  );
  assert.equal(await companionImages.count(), 1);
  assert.ok(await companionImages.get("hello"));
});
