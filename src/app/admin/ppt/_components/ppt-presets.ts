export type Preset = {
  id: string;
  label: string;
  topic: string;
  slideCount: number;
  tone: "科普" | "商务" | "学术" | "儿童" | "极简";
};

export const PRESETS: Preset[] = [
  {
    id: "low-carbon",
    label: "低碳环保科普（2页）",
    topic: "低碳环保：守护我们的共同家园",
    slideCount: 2,
    tone: "科普",
  },
  {
    id: "weekly-report",
    label: "周报汇报（2页）",
    topic: "AI 内容创作平台前端周报（本周进展 / 风险 / 下周计划）",
    slideCount: 2,
    tone: "商务",
  },
  {
    id: "product-intro",
    label: "产品介绍（2页）",
    topic: "AI 驱动内容创作平台：产品介绍（痛点 / 方案 / 亮点 / 演示 / 收益）",
    slideCount: 2,
    tone: "商务",
  },
  {
    id: "kids-space",
    label: "儿童科普（2页）",
    topic: "太空为什么是黑色的？（适合儿童的科普讲解）",
    slideCount: 2,
    tone: "儿童",
  },
];
