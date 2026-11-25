import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import {
  backupSchema,
  configSchema,
  idSchema,
  type WorldConfig,
  WorldError,
  worldKindSchema,
} from "./model";
import { worldGradientFromSeed, worldGradients } from "./world-gradient";
import type { WorldTemplate, WorldTemplateFile } from "./world-template-model";

export type { WorldTemplate, WorldTemplateFile } from "./world-template-model";

const templateMetaSchema = z.object({
  description: z.string().trim().min(1).max(800),
  details: z.string().trim().min(1).max(120),
  gradient: z.enum(worldGradients),
  kind: worldKindSchema.optional(),
  sourceRoomId: idSchema.optional(),
});

const templatesDir = join(process.cwd(), "data", "novels", "template");
const localTemplatesDir = join(templatesDir, "local");

function jsonFiles(dir: string) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(dir, name));
}

export function loadWorldTemplates(): WorldTemplate[] {
  const files = [
    ...jsonFiles(templatesDir).map((file) => ({
      file,
      source: "builtin" as const,
    })),
    ...jsonFiles(localTemplatesDir).map((file) => ({
      file,
      source: "local" as const,
    })),
  ].sort((a, b) => a.file.localeCompare(b.file));
  if (files.length === 0) throw new Error(`未找到世界模板：${templatesDir}`);
  const seen = new Set<string>();
  return files.map(({ file, source }) => {
    const name = basename(file);
    const id = idSchema.parse(name.slice(0, -".json".length));
    if (seen.has(id)) throw new Error(`世界模板 id 重复：${id}`);
    seen.add(id);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      throw new Error(`世界模板无效：${name}`, { cause: error });
    }
    return isWorldChat(raw)
      ? templateFromBackup(id, name, raw, source)
      : templateFromConfig(id, name, raw, source);
  });
}

export function listWorldTemplateIds() {
  return loadWorldTemplates().map((template) => template.id);
}

function isWorldChat(raw: unknown) {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "format" in raw &&
    raw.format === "world-chat"
  );
}

function templateError(name: string, issues: { message: string }[]) {
  return new Error(
    `世界模板无效：${name}：${issues.map((issue) => issue.message).join("；")}`,
  );
}

function requireAvatars(name: string, config: WorldConfig) {
  const missingAvatar = config.characters.find(
    (character) => !character.avatar,
  );
  if (missingAvatar)
    throw new Error(`世界模板缺少角色头像：${name} / ${missingAvatar.id}`);
}

function cardText(text: string, max: number) {
  const value = text.trim();
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function templateFromConfig(
  id: string,
  name: string,
  raw: unknown,
  source: WorldTemplate["source"],
): WorldTemplate {
  const meta = templateMetaSchema.safeParse(raw);
  const config = configSchema.safeParse(raw);
  if (!meta.success || !config.success) {
    throw templateError(name, [
      ...(meta.success ? [] : meta.error.issues),
      ...(config.success ? [] : config.error.issues),
    ]);
  }
  requireAvatars(name, config.data);
  return {
    id,
    kind: meta.data.kind ?? "script",
    description: meta.data.description,
    details: meta.data.details,
    gradient: meta.data.gradient,
    source,
    config: config.data,
    sourceRoomId: meta.data.sourceRoomId,
  };
}

function templateFromBackup(
  id: string,
  name: string,
  raw: unknown,
  source: WorldTemplate["source"],
): WorldTemplate {
  const backup = backupSchema.safeParse(raw);
  const meta = templateMetaSchema.partial().safeParse(raw);
  if (!backup.success || !meta.success) {
    throw templateError(name, [
      ...(backup.success ? [] : backup.error.issues),
      ...(meta.success ? [] : meta.error.issues),
    ]);
  }
  requireAvatars(name, backup.data.config);
  return {
    id,
    kind: backup.data.kind,
    description:
      meta.data.description ?? cardText(backup.data.config.scene, 800),
    details:
      meta.data.details ??
      cardText(
        backup.data.config.characters
          .map((character) => character.name)
          .join(" · "),
        120,
      ),
    gradient: meta.data.gradient ?? worldGradientFromSeed(id),
    source,
    config: backup.data.config,
    sourceRoomId: meta.data.sourceRoomId,
  };
}

export function saveLocalWorldTemplate(template: WorldTemplate) {
  const id = idSchema.parse(template.id);
  if (existsSync(join(templatesDir, `${id}.json`)))
    throw new WorldError("conflict", `模板 id 与内置模板冲突：${id}`, 409);
  mkdirSync(localTemplatesDir, { recursive: true });
  const path = join(localTemplatesDir, `${id}.json`);
  if (existsSync(path))
    throw new WorldError("conflict", `本地模板已存在：${id}`, 409);
  requireAvatars(id, template.config);
  const file: WorldTemplateFile = {
    description: template.description,
    details: template.details,
    gradient: template.gradient,
    kind: template.kind,
    ...(template.sourceRoomId ? { sourceRoomId: template.sourceRoomId } : {}),
    ...template.config,
  };
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return { id, path: `data/novels/template/local/${id}.json` };
}

const templates = loadWorldTemplates();
export const exampleWorld = (templates.find(
  (template) => template.id === "fog-harbor",
) ?? templates[0])!.config;
