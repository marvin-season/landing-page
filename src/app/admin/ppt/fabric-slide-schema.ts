import { z } from "zod";

export const PPT_CANVAS = {
  width: 600,
  height: 360,
} as const;

const colorSchema = z.string().min(1);
const nonNegativeNumber = z.number().finite().min(0);
const finiteNumber = z.number().finite();

const baseObjectSchema = z
  .object({
    type: z.string().min(1),
    left: finiteNumber.optional(),
    top: finiteNumber.optional(),
    selectable: z.boolean().optional(),
    opacity: z.number().finite().min(0).max(1).optional(),
    angle: z.number().finite().optional(),
    fill: colorSchema.optional(),
  })
  // Fabric 的 JSON 会包含大量额外字段；为了兼容 LLM 输出/未来扩展，这里允许透传未知字段
  .passthrough();

export const rectObjectSchema = baseObjectSchema
  .extend({
    type: z.literal("Rect"),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    rx: nonNegativeNumber.optional(),
    ry: nonNegativeNumber.optional(),
  })
  .passthrough();

export const iTextObjectSchema = baseObjectSchema
  .extend({
    type: z.literal("IText"),
    text: z.string(),
    width: z.number().finite().positive().optional(),
    fontSize: z.number().finite().positive().optional(),
    fontFamily: z.string().min(1).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    fontStyle: z.string().min(1).optional(),
    lineHeight: z.number().finite().positive().optional(),
    textAlign: z
      .union([
        z.literal("left"),
        z.literal("center"),
        z.literal("right"),
        z.literal("justify"),
      ])
      .optional(),
  })
  .passthrough();

export const fabricObjectSchema = z.discriminatedUnion("type", [
  rectObjectSchema,
  iTextObjectSchema,
]);

export const fabricSlideSchema = z
  .object({
    version: z.string().optional(),
    objects: z.array(fabricObjectSchema).min(1),
  })
  .passthrough();

export const fabricSlidesDocumentSchema = z.object({
  slides: z.array(fabricSlideSchema).min(1),
});

export type FabricSlideJSON = z.infer<typeof fabricSlideSchema>;
export type FabricSlidesDocument = z.infer<typeof fabricSlidesDocumentSchema>;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function coerceFinite(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

/**
 * 轻量归一化：保证关键数值在画布范围内、补默认值，降低模型输出的“轻微越界/缺省”导致的渲染失败概率。
 */
export function normalizeFabricSlideJSON(
  slide: FabricSlideJSON,
): FabricSlideJSON {
  const objects = slide.objects.map((obj) => {
    const left = clamp(coerceFinite(obj.left, 0), 0, PPT_CANVAS.width);
    const top = clamp(coerceFinite(obj.top, 0), 0, PPT_CANVAS.height);

    if (obj.type === "Rect") {
      const width = clamp(coerceFinite(obj.width, 1), 1, PPT_CANVAS.width);
      const height = clamp(coerceFinite(obj.height, 1), 1, PPT_CANVAS.height);
      return {
        ...obj,
        left,
        top,
        width,
        height,
        fill: obj.fill ?? "#ffffff",
      };
    }

    // IText
    return {
      ...obj,
      left,
      top,
      fontSize: obj.fontSize ?? 16,
      fill: obj.fill ?? "#111827",
    };
  });

  return { ...slide, objects };
}

/**
 * 给大模型的“约束说明”（适合塞进 system prompt / instructions）。
 * 这是我们“可用子集”的契约：只允许 Rect/IText，画布尺寸 600x360。
 */
export const FABRIC_PPT_SYSTEM_PROMPT = [
  "你是一个 Fabric.js PPT 画布 JSON 生成器。",
  `画布尺寸固定：width=${PPT_CANVAS.width}, height=${PPT_CANVAS.height}。`,
  "你只能输出严格的 JSON（不允许 Markdown、注释或多余文本）。",
  "你必须输出一个对象：{ slides: Slide[] }。",
  "每个 Slide 必须是 Fabric Canvas JSON 的子集：{ version?: string, objects: FabricObject[] }。",
  "仅允许的 FabricObject 类型：",
  '- Rect：{ type:"Rect", left:number, top:number, width:number, height:number, fill?:string, rx?:number, ry?:number, selectable?:boolean }',
  '- IText：{ type:"IText", left:number, top:number, text:string, fontSize?:number, fill?:string, fontWeight?:string|number, fontFamily?:string, fontStyle?:string, lineHeight?:number, textAlign?:"left"|"center"|"right"|"justify", width?:number }',
  "规则：",
  `- left/top 必须在画布内：0<=left<=${PPT_CANVAS.width}, 0<=top<=${PPT_CANVAS.height}`,
  "- Rect 的 width/height 必须为正数",
  "- 尽量不要让对象超出画布边界（left+width <= canvas.width, top+height <= canvas.height）",
  "- 颜色用十六进制或 CSS color 字符串",
].join("\n");
