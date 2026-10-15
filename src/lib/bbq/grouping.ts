import { BbqStoreError } from "./store";
import type { GroupingSettings } from "./types";

export const MAX_GROUP_NAME_LENGTH = 10;
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

// 按用户看到的字符计数，中文、组合字符和 emoji 都不会按 UTF-16 长度误算。
export function groupNameLength(value: string): number {
  return Array.from(segmenter.segment(value)).length;
}

export function requireGroupName(value: unknown): string {
  if (typeof value !== "string") throw new BbqStoreError("invalid_group_name");
  const name = value.trim();
  if (!name || groupNameLength(name) > MAX_GROUP_NAME_LENGTH) {
    throw new BbqStoreError("invalid_group_name");
  }
  return name;
}

export function requireGroupingSettings(value: unknown): GroupingSettings {
  if (
    typeof value !== "object" ||
    value === null ||
    !("enabled" in value) ||
    typeof value.enabled !== "boolean" ||
    !("names" in value) ||
    !Array.isArray(value.names)
  )
    throw new BbqStoreError("invalid_group_settings");
  const names = value.names.map(requireGroupName);
  if (new Set(names).size !== names.length)
    throw new BbqStoreError("group_exists");
  return { enabled: value.enabled, names };
}
