import {
  normalizeSkillIds,
  type WritingSkill,
  writingSkills,
} from "./writing-skills";

export type SlashSkillQuery = {
  /** `/` 在 value 中的起始下标 */
  start: number;
  /** `/` 之后、光标之前的过滤词 */
  query: string;
};

/** `/query` 在原文中的结束下标（不含后续正文）。 */
export function slashSkillEnd({ start, query }: SlashSkillQuery) {
  return start + 1 + query.length;
}

/** 光标前紧邻的 `/query`：须在行首或空白后，且 query 不含空白。 */
export function readSlashSkillQuery(
  value: string,
  cursor: number,
): SlashSkillQuery | null {
  const head = value.slice(0, Math.max(0, Math.min(cursor, value.length)));
  const match = /(?:^|\s)\/([^\s/]*)$/u.exec(head);
  if (!match) return null;
  return {
    start: head.length - match[0].length + (match[0].startsWith("/") ? 0 : 1),
    query: match[1] ?? "",
  };
}

export function filterWritingSkills(query: string): WritingSkill[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return writingSkills;
  return writingSkills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(needle) ||
      skill.id.toLowerCase().includes(needle) ||
      skill.description.toLowerCase().includes(needle),
  );
}

export function applyWritingSkillSlash(
  value: string,
  skillId: string,
  selected: string[] | undefined,
  slash: SlashSkillQuery | null,
) {
  const skills = normalizeSkillIds([...(selected ?? []), skillId]);
  if (!slash) return { value, cursor: value.length, skills };
  const end = Math.min(slashSkillEnd(slash), value.length);
  if (value.slice(slash.start, slash.start + 1) !== "/")
    return { value, cursor: value.length, skills };
  const before = value.slice(0, slash.start);
  const after = value.slice(end);
  return {
    value: `${before}${after}`,
    cursor: before.length,
    skills,
  };
}

export function selectedWritingSkills(ids: string[] | undefined) {
  const selected = new Set(normalizeSkillIds(ids));
  return writingSkills.filter((skill) => selected.has(skill.id));
}
