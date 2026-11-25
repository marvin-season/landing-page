import {
  idSchema,
  type WorldConfig,
  WorldError,
  type WorldKind,
} from "./model";
import type { WorldGradient } from "./world-gradient";

export const maxTemplateNovelFileBytes = 2 * 1024 * 1024;

export function templateNovelByteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

export type WorldTemplateSource = "builtin" | "local";

export type WorldTemplate = {
  id: string;
  description: string;
  details: string;
  gradient: WorldGradient;
  kind: WorldKind;
  /** 内置模板来自 template/，本地模板来自 template/local/ */
  source: WorldTemplateSource;
  config: WorldConfig;
  /** 从小说生成时关联的「我的作品」房间 */
  sourceRoomId?: string;
};

export type WorldTemplateFile = {
  description: string;
  details: string;
  gradient: WorldGradient;
  kind: WorldKind;
  sourceRoomId?: string;
} & WorldConfig;

export function slugifyTemplateId(source: string) {
  const ascii = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (ascii && idSchema.safeParse(ascii).success) return ascii;
  let hash = 0;
  for (const char of source)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return `novel-${hash.toString(36)}`;
}

export function allocateTemplateId(
  source: string,
  reserved: Iterable<string> = [],
) {
  const used = new Set(reserved);
  const base = slugifyTemplateId(source) || "novel-template";
  if (!used.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new WorldError("conflict", "无法分配唯一的模板 id", 409);
}
