import { z } from "zod";
import {
  characterSchema,
  configSchema,
  idSchema,
  WorldError,
  worldKindSchema,
} from "./model";
import type { Complete } from "./provider";
import { worldAvatarFromSeed } from "./world-avatar";
import {
  type WorldGradient,
  worldGradientFromSeed,
  worldGradients,
} from "./world-gradient";
import {
  allocateTemplateId,
  maxTemplateNovelFileBytes,
  templateNovelByteLength,
  type WorldTemplate,
  type WorldTemplateFile,
} from "./world-template-model";
import { listWorldTemplateIds } from "./world-templates";

const extractCharacterSchema = characterSchema
  .omit({ avatar: true, model: true, enabled: true })
  .extend({
    avatar: z.string().trim().optional(),
    model: z.string().trim().optional(),
    enabled: z.boolean().optional(),
  });

const extractPayloadSchema = z.object({
  id: z.string().trim().optional(),
  description: z.string().trim().min(1).max(800),
  details: z.string().trim().min(1).max(120),
  gradient: z.enum(worldGradients).optional(),
  kind: worldKindSchema.optional(),
  title: z.string().trim().min(1).max(60),
  background: z.string().trim().min(1).max(8000),
  scene: z.string().trim().min(1).max(2000),
  rules: z.string().trim().max(4000).default(""),
  facts: z.string().trim().max(4000).default(""),
  storyGoal: z.string().trim().max(4000).default(""),
  maxTurns: z.number().int().min(1).max(10).default(3),
  characters: z.array(extractCharacterSchema).min(2).max(7),
});

export const extractTemplateInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1)
    .superRefine((value, ctx) => {
      if (templateNovelByteLength(value) > maxTemplateNovelFileBytes) {
        ctx.addIssue({
          code: "custom",
          message: "小说文件不能超过 2MB",
        });
      }
    }),
  kind: worldKindSchema.default("novel"),
  model: z.string().trim().min(1).max(160).default("cursor/auto"),
  fileName: z.string().trim().max(200).optional(),
});

export type ExtractTemplateInput = z.infer<typeof extractTemplateInputSchema>;

export const saveTemplateInputSchema = z.object({
  id: idSchema.optional(),
  description: z.string().trim().min(1).max(800),
  details: z.string().trim().min(1).max(120),
  gradient: z.enum(worldGradients),
  kind: worldKindSchema,
  config: configSchema,
  sourceRoomId: idSchema.optional(),
});

export type SaveTemplateInput = z.infer<typeof saveTemplateInputSchema>;

export const extractTemplateInstructions = `你是开放世界设定编辑。根据用户提供的小说正文，逆向整理成可直接开局的世界模板 JSON。

要求：
1. 只输出一个 JSON 对象，不要 Markdown 代码块，不要解释。
2. 字段必须包含：description、details、gradient、title、background、scene、rules、facts、storyGoal、maxTurns、characters。
3. description ≤800 字，概括氛围与玩法；details ≤120 字，用「角色 · 地点 · 冲突」短标签。
4. gradient 只能是：${worldGradients.join(" / ")}。
5. title、background、scene、rules、facts、storyGoal 写成可直接给角色扮演用的设定，不要剧透全书结局；scene 写成开场当下；facts 只写开场已知事实。
6. characters 取 2～7 个对剧情最关键的角色：id 用小写英文短横线（如 zhou-qiang），name/identity/personality/goal 必填；publicInfo 写公开可知信息，privateInfo 写未公开动机或秘密；style 写说话习惯。不要写 avatar、model、enabled。
7. 角色名称不要重复；不要使用 id：user / system / narrator。
8. maxTurns 固定为 3。
9. 正文不足时合理推断，但不要编造与原文明显冲突的设定。`;

function stripJsonFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
}

function uniqueCharacterIds(
  characters: z.infer<typeof extractCharacterSchema>[],
) {
  const used = new Set<string>();
  return characters.map((character, index) => {
    const base = idSchema.safeParse(character.id).success
      ? character.id
      : `character-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (
      used.has(id) ||
      id === "user" ||
      id === "system" ||
      id === "narrator"
    ) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    return { ...character, id };
  });
}

export function parseExtractedWorldTemplate(
  text: string,
  options: {
    kind: z.infer<typeof worldKindSchema>;
    model: string;
    reservedIds?: Iterable<string>;
  },
): WorldTemplate {
  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonFence(text));
  } catch {
    throw new WorldError("invalid_template", "模型未返回有效的模板 JSON", 502);
  }
  const parsed = extractPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new WorldError(
      "invalid_template",
      `模板字段无效：${parsed.error.issues.map((issue) => issue.message).join("；")}`,
      502,
    );
  }
  const characters = uniqueCharacterIds(parsed.data.characters).map(
    (character) => ({
      ...character,
      model: options.model,
      enabled: true,
      avatar: worldAvatarFromSeed(`${character.id}:${character.name}`),
    }),
  );
  const config = configSchema.parse({
    title: parsed.data.title,
    background: parsed.data.background,
    scene: parsed.data.scene,
    rules: parsed.data.rules,
    facts: parsed.data.facts,
    storyGoal: parsed.data.storyGoal,
    maxTurns: parsed.data.maxTurns,
    characters,
  });
  const id = allocateTemplateId(
    parsed.data.id || parsed.data.title,
    options.reservedIds,
  );
  const gradient: WorldGradient =
    parsed.data.gradient ?? worldGradientFromSeed(id);
  return {
    id,
    kind: options.kind,
    description: parsed.data.description,
    details: parsed.data.details,
    gradient,
    config,
  };
}

export function templateToFile(template: WorldTemplate): WorldTemplateFile {
  return {
    description: template.description,
    details: template.details,
    gradient: template.gradient,
    kind: template.kind,
    ...(template.sourceRoomId ? { sourceRoomId: template.sourceRoomId } : {}),
    ...template.config,
  };
}

export async function extractWorldTemplateFromNovel(
  input: ExtractTemplateInput,
  complete: Complete,
  signal: AbortSignal,
): Promise<WorldTemplate> {
  const payload = extractTemplateInputSchema.parse({
    ...input,
    text: assertNovelTextForTemplate(input.text),
  });
  const result = await complete({
    purpose: "writer",
    model: payload.model,
    signal,
    maxCharacters: 12_000,
    timeoutMs: 180_000,
    idleTimeoutMs: 120_000,
    messages: [
      { role: "system", content: extractTemplateInstructions },
      {
        role: "user",
        content: JSON.stringify({
          task: "extract-world-template",
          kind: payload.kind,
          fileName: payload.fileName ?? "",
          novel: payload.text,
        }),
      },
    ],
  });
  return parseExtractedWorldTemplate(result.text, {
    kind: payload.kind,
    model: payload.model,
    reservedIds: listWorldTemplateIds(),
  });
}

export function assertNovelTextForTemplate(text: string) {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!normalized) throw new WorldError("invalid_body", "小说文件为空");
  if (normalized.includes("\0"))
    throw new WorldError("invalid_body", "小说文件不是有效的纯文本");
  if (/(?:^|\n)<!-- novel-background\b/.test(normalized))
    throw new WorldError(
      "invalid_body",
      "这是背景总结，请选择包含小说正文的文件",
    );
  if (templateNovelByteLength(normalized) > maxTemplateNovelFileBytes)
    throw new WorldError("too_large", "小说文件不能超过 2MB", 413);
  return normalized;
}
