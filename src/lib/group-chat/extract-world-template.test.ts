import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import {
  assertNovelTextForTemplate,
  parseExtractedWorldTemplate,
  templateToFile,
} from "./extract-world-template";
import { defaultWorldCharacterModel } from "./model";
import {
  allocateTemplateId,
  maxTemplateNovelFileBytes,
  slugifyTemplateId,
} from "./world-template-model";

const sampleJson = JSON.stringify({
  description: "宿舍、欲望与压抑交织的校园暗流。",
  details: "周强 · 宿舍 · 欲望",
  gradient: "rose",
  title: "爱与恨",
  background: "期末周的大学宿舍，每个人都有不肯说出口的欲望和秘密。",
  scene: "夜里，宿舍风扇嗡嗡转，周强盯着习题发呆。",
  rules: "只按角色当下动机行动，不跳到全书结局。",
  facts: "周强是处男，正在复习高等数学。",
  storyGoal: "从宿舍日常推进人物关系与冲突。",
  maxTurns: 3,
  characters: [
    {
      id: "zhou-qiang",
      name: "周强",
      identity: "大学生",
      personality: "压抑、敏感",
      goal: "熬过复习周",
      publicInfo: "同宿舍的普通男生",
      privateInfo: "性欲旺盛却不敢在宿舍解决",
      style: "短句，内心戏多",
    },
    {
      id: "roommate",
      name: "室友",
      identity: "同宿舍同学",
      personality: "大大咧咧",
      goal: "照常生活",
      publicInfo: "随时可能推门回来",
      privateInfo: "未必知情周强的心事",
      style: "口语随意",
    },
  ],
});

test("parses extracted world template json", () => {
  const template = parseExtractedWorldTemplate(sampleJson, {
    kind: "novel",
    model: defaultWorldCharacterModel,
    reservedIds: ["fog-harbor"],
  });
  assert.equal(template.kind, "novel");
  assert.equal(template.config.title, "爱与恨");
  assert.equal(template.config.characters.length, 2);
  assert.ok(template.config.characters.every((character) => character.avatar));
  assert.ok(
    template.config.characters.every(
      (c) => c.model === defaultWorldCharacterModel,
    ),
  );
  assert.match(template.id, /^[\w-]+$/);
  assert.equal(templateToFile(template).kind, "novel");
});

test("rejects oversized novel text", () => {
  assert.throws(
    () => assertNovelTextForTemplate("a".repeat(maxTemplateNovelFileBytes + 1)),
    /不能超过 2MB/,
  );
});

test("slugifies and allocates template ids", () => {
  assert.equal(slugifyTemplateId("Fog Harbor"), "fog-harbor");
  assert.equal(
    allocateTemplateId("fog-harbor", ["fog-harbor", "fog-harbor-2"]),
    "fog-harbor-3",
  );
  assert.match(allocateTemplateId("爱与恨", []), /^novel-[a-z0-9]+$/);
});

const tempRoots: string[] = [];
afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

test("saves template file shape", () => {
  const root = mkdtempSync(join(tmpdir(), "world-template-"));
  tempRoots.push(root);
  const template = parseExtractedWorldTemplate(sampleJson, {
    kind: "novel",
    model: defaultWorldCharacterModel,
    reservedIds: [],
  });
  // Exercise serializer without touching repo local dir.
  const file = templateToFile({ ...template, id: "love-and-hate-test" });
  writeFileSync(join(root, "love-and-hate-test.json"), JSON.stringify(file));
  assert.equal(file.title, "爱与恨");
  assert.equal(file.characters[0]?.avatar !== undefined, true);
});
