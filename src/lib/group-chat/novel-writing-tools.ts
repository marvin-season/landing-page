import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  normalizeSkillIds,
  type WritingSkillScope,
  writingSkills,
} from "@/app/agent/worlds/_components/novel/writing-skills";

const skillById = new Map(writingSkills.map((skill) => [skill.id, skill]));

export function allowedWritingSkillIds(
  pool: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
) {
  const scopes = new Set(Array.isArray(scope) ? scope : [scope]);
  const selected = normalizeSkillIds(pool);
  const source = selected.length
    ? selected
    : writingSkills.map((skill) => skill.id);
  return source.filter((id) => {
    const skill = skillById.get(id);
    return skill?.appliesTo.some((item) => scopes.has(item));
  });
}

/** Writer 挂载写作技法；返回 instructions 供后续步骤遵守。 */
export function createNovelWritingTools(
  pool: string[] | undefined,
  scope: WritingSkillScope | WritingSkillScope[],
) {
  const allowed = new Set(allowedWritingSkillIds(pool, scope));
  const applied = new Set<string>();
  return {
    apply_writing_skill: createTool({
      id: "apply_writing_skill",
      description:
        "静默挂载一条写作技法。需要强化场景、对白或章末收束时调用；不需要可不调用。同一技法重复调用会返回已挂载结果。调用后直接写正文，不要在正文里提及本工具或技法名。",
      inputSchema: z.object({
        skillId: z
          .string()
          .describe("skillCatalog 中的技法 id，例如 scene-driven"),
      }),
      outputSchema: z.object({
        id: z.string(),
        name: z.string(),
        instructions: z.string(),
        alreadyApplied: z.boolean().optional(),
      }),
      execute: async ({ skillId }) => {
        if (!allowed.has(skillId)) {
          throw new Error(
            `技法 ${skillId} 不在本次可选池中，请只使用 skillCatalog 里的 id。`,
          );
        }
        const skill = skillById.get(skillId);
        if (!skill) throw new Error(`未知技法：${skillId}`);
        if (applied.has(skillId)) {
          return {
            id: skill.id,
            name: skill.name,
            instructions: skill.instructions,
            alreadyApplied: true,
          };
        }
        applied.add(skillId);
        return {
          id: skill.id,
          name: skill.name,
          instructions: skill.instructions,
        };
      },
    }),
  };
}

export function writingToolScopeForTask(
  task: "chapter" | "rewrite" | "summary",
): WritingSkillScope | WritingSkillScope[] | null {
  if (task === "summary") return null;
  if (task === "chapter") return "chapter";
  // 润色与剧情整理共用 rewrite 任务通道；目录按 rewrite+plot 开放。
  return ["rewrite", "plot"];
}

/** 从 Writer prompt JSON 读取作者限定的技法池。 */
export function skillPoolFromPrompt(prompt: string) {
  try {
    const parsed = JSON.parse(prompt) as {
      skillCatalog?: Array<{ id?: string }>;
      skills?: Array<{ id?: string } | string>;
    };
    const catalog = parsed.skillCatalog;
    if (Array.isArray(catalog) && catalog.length) {
      return catalog
        .map((item) => (typeof item?.id === "string" ? item.id : ""))
        .filter(Boolean);
    }
    const skills = parsed.skills;
    if (Array.isArray(skills) && skills.length) {
      return skills
        .map((item) =>
          typeof item === "string"
            ? item
            : typeof item?.id === "string"
              ? item.id
              : "",
        )
        .filter(Boolean);
    }
  } catch {
    // prompt 不是 JSON 时开放全部技法。
  }
  return undefined;
}
