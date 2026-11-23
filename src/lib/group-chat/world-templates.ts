import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import {
  backupSchema,
  configSchema,
  idSchema,
  type WorldConfig,
  type WorldKind,
} from "./model";
import {
  type WorldGradient,
  worldGradientFromSeed,
  worldGradients,
} from "./world-gradient";

const templateMetaSchema = z.object({
  description: z.string().trim().min(1).max(800),
  details: z.string().trim().min(1).max(120),
  gradient: z.enum(worldGradients),
});

export type WorldTemplate = {
  id: string;
  description: string;
  details: string;
  gradient: WorldGradient;
  kind: WorldKind;
  config: WorldConfig;
};

const templatesDir = join(process.cwd(), "data", "novels", "template");

function jsonFiles(dir: string) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(dir, name));
}

export function loadWorldTemplates(): WorldTemplate[] {
  const files = [
    ...jsonFiles(templatesDir),
    ...jsonFiles(join(templatesDir, "local")),
  ].sort((a, b) => a.localeCompare(b));
  if (files.length === 0) throw new Error(`未找到世界模板：${templatesDir}`);
  const seen = new Set<string>();
  return files.map((file) => {
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
      ? templateFromBackup(id, name, raw)
      : templateFromConfig(id, name, raw);
  });
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
    kind: "script",
    description: meta.data.description,
    details: meta.data.details,
    gradient: meta.data.gradient,
    config: config.data,
  };
}

function templateFromBackup(
  id: string,
  name: string,
  raw: unknown,
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
    config: backup.data.config,
  };
}

const templates = loadWorldTemplates();
export const exampleWorld = (templates.find(
  (template) => template.id === "fog-harbor",
) ?? templates[0])!.config;
