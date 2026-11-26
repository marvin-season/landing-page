import type { WorldConfig } from "./model";

const blankNovelScene = "可根据创作要求开始第一章，故事背景和角色设定待补充。";

/** 独立小说共用的默认世界与角色设定。 */
export function standaloneNovelConfig(
  title: string,
  {
    model = "cursor/auto",
    source = "import",
  }: { model?: string; source?: "blank" | "import" } = {},
): WorldConfig {
  const name = title.trim().slice(0, 60) || "未命名小说";
  return {
    title: name,
    background:
      source === "blank"
        ? "世界背景待补充。"
        : `《${name}》由导入正文创建，世界设定待补充或从正文生成模板后关联。`,
    scene:
      source === "blank"
        ? blankNovelScene
        : "故事已有导入章节，可直接续写或先生成世界模板。",
    rules: "优先延续已有正文的人物、时间线与文风；未设定的世界规则视为待补充。",
    facts: "",
    storyGoal: "",
    narration: false,
    maxTurns: 3,
    characters: [
      {
        id: "protagonist",
        name: "主角",
        identity: "待补充",
        personality: "待补充",
        goal: "待补充",
        publicInfo: "",
        privateInfo: "",
        style: "",
        model,
        enabled: true,
        avatar: "female-02",
      },
      {
        id: "supporting",
        name: "配角",
        identity: "待补充",
        personality: "待补充",
        goal: "待补充",
        publicInfo: "",
        privateInfo: "",
        style: "",
        model,
        enabled: true,
        avatar: "male-02",
      },
    ],
  };
}

/** 识别独立小说仍使用默认占位设定。 */
export function isStandaloneNovelPlaceholder(config: WorldConfig) {
  if (config.characters.length !== 2) return false;
  const [a, b] = config.characters;
  if (a.id !== "protagonist" || b.id !== "supporting") return false;
  if (a.identity !== "待补充" || b.identity !== "待补充") return false;
  return (
    config.scene === blankNovelScene ||
    config.background.includes("由导入正文创建") ||
    config.scene.includes("可直接续写或先生成世界模板")
  );
}

export function novelSettingsHintKey(roomId: string) {
  return `world-novel-settings-hint:${roomId}`;
}
