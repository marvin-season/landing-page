export type WritingSkillScope = "chapter" | "rewrite" | "plot";

export type WritingSkill = {
  id: string;
  name: string;
  description: string;
  appliesTo: WritingSkillScope[];
  instructions: string;
};

/** 注入 prompt 的技法片段；不含 name/description，控制上下文体积。 */
export type WritingSkillPayload = {
  id: string;
  instructions: string;
};

/** 供 Writer 自选挂载的技法目录（不含 instructions）。 */
export type WritingSkillCatalogItem = {
  id: string;
  name: string;
  description: string;
};

/** 全部启用技法的 instructions 合计上限（字符）。 */
export const maxWritingSkillsCharacters = 800;

export const writingSkills: WritingSkill[] = [
  {
    id: "scene-driven",
    name: "场景驱动",
    description: "用具体场景、动作和感官推进，少写总结式旁白。",
    appliesTo: ["chapter", "rewrite", "plot"],
    instructions:
      "优先用可感知的场景、动作与物件变化推进情节；少用抽象总结、情绪标签和作者旁白点题。一段里先写清人物在做什么、环境有何变化，再写反应。",
  },
  {
    id: "dialogue-first",
    name: "对白优先",
    description: "信息差与潜台词走对白，避免作者替角色点破。",
    appliesTo: ["chapter", "rewrite"],
    instructions:
      "关键信息、立场冲突和潜台词尽量通过对白与对话中的动作传递；不要用旁白替角色说出他们未说破的意图。对白保持身份口吻差异，避免轮流长篇解说。",
  },
  {
    id: "chapter-hook",
    name: "章末钩子",
    description: "章末停在未决情境，不作总结或预告下一章。",
    appliesTo: ["chapter"],
    instructions:
      "章末停在具体未决的动作、对白或发现上，留出下一步压力；禁止章末总结、主题升华、预告下一章或空泛收束句。",
  },
  {
    id: "prose-imagery",
    name: "意象与余韵",
    description: "偏散文：以感官意象与氛围收束，少硬推情节。",
    appliesTo: ["chapter", "rewrite"],
    instructions:
      "以可感的物象、光影、气味与声音承载情绪，让氛围自然流转；少用情节硬推和结论式旁白。段末留一点未说尽的余味，避免主题升华、口号收束或抒情套话堆砌。",
  },
];

const skillById = new Map(writingSkills.map((skill) => [skill.id, skill]));

export function normalizeSkillIds(ids: string[] | undefined) {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (!skillById.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

function skillIdsForScope(
  ids: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
) {
  const scopes = new Set(Array.isArray(scope) ? scope : [scope]);
  const selected = normalizeSkillIds(ids);
  const source = selected.length
    ? selected
    : writingSkills.map((skill) => skill.id);
  return source.filter((id) => {
    const skill = skillById.get(id);
    return skill?.appliesTo.some((item) => scopes.has(item));
  });
}

export function resolveWritingSkills(
  ids: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
): WritingSkillPayload[] {
  const selected: WritingSkillPayload[] = [];
  let used = 0;
  // 静默注入仍只使用作者点选的 id；空池不注入。
  for (const id of normalizeSkillIds(ids)) {
    const skill = skillById.get(id);
    if (!skill) continue;
    const scopes = new Set(Array.isArray(scope) ? scope : [scope]);
    if (!skill.appliesTo.some((item) => scopes.has(item))) continue;
    const next = used + skill.instructions.length;
    if (next > maxWritingSkillsCharacters) break;
    selected.push({ id: skill.id, instructions: skill.instructions });
    used = next;
  }
  return selected;
}

export function resolveWritingSkillCatalog(
  ids: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
): WritingSkillCatalogItem[] {
  return skillIdsForScope(ids, scope).flatMap((id) => {
    const skill = skillById.get(id);
    if (!skill) return [];
    return [
      {
        id: skill.id,
        name: skill.name,
        description: skill.description,
      },
    ];
  });
}

export function writingSkillsField(
  ids: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
) {
  const skills = resolveWritingSkills(ids, scope);
  return skills.length ? { skills } : {};
}

/** 写入 prompt 的可选技法目录；空选择时开放当前任务范围内全部内置技法。 */
export function writingSkillCatalogField(
  ids: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
) {
  const skillCatalog = resolveWritingSkillCatalog(ids, scope);
  return skillCatalog.length ? { skillCatalog } : {};
}
