import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import { configSchema, idSchema, type WorldConfig } from "./model";

const templateMetaSchema = z.object({
  description: z.string().trim().min(1).max(800),
  details: z.string().trim().min(1).max(120),
});

export type WorldTemplate = {
  id: string;
  description: string;
  details: string;
  config: WorldConfig;
};

const templatesDir = join(process.cwd(), "public/worlds");

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
    const meta = templateMetaSchema.safeParse(raw);
    const config = configSchema.safeParse(raw);
    if (!meta.success || !config.success) {
      const issues = [
        ...(meta.success ? [] : meta.error.issues),
        ...(config.success ? [] : config.error.issues),
      ];
      throw new Error(
        `世界模板无效：${name}：${issues.map((issue) => issue.message).join("；")}`,
      );
    }
    return {
      id,
      description: meta.data.description,
      details: meta.data.details,
      config: config.data,
    };
  });
}

const templates = loadWorldTemplates();
export const exampleWorld = (templates.find(
  (template) => template.id === "fog-harbor",
) ?? templates[0])!.config;
