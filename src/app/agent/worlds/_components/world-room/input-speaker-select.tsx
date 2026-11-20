"use client";

import { SelectItem, SelectSeparator } from "@landing-page/design-system";
import { WorldSelect } from "../world-select";

export function inputPlaceholder(speaker: string, label: string) {
  if (speaker === "narrator")
    return "写下旁白，例如：雨停了，控制室里只剩对讲机的电流声。";
  if (speaker === "system")
    return "输入系统干预，例如：让暴雨停下来，大家开始调查停电原因。";
  return `以${label}的身份说一句话。`;
}

export function inputHint(
  speaker: string,
  label: string,
  paused: boolean,
  mentionCount: number,
) {
  if (paused && mentionCount)
    return "提交点名后立即继续，指定 NPC 优先行动，随后自动推进。";
  if (paused)
    return speaker === "system"
      ? "当前已暂停，提交只保存指令；继续后生效。"
      : "当前已暂停，提交只保存这一条；继续后生效。";
  if (speaker === "narrator")
    return "这段会直接写成旁白，随后由角色接话。@ 仍可指定接下来谁先说。";
  if (speaker !== "system")
    return `这段会作为${label}已经说出的对白，其他角色接着回应。`;
  return "指令会中止当前生成并调整后续剧情 · @ 可指定 NPC 优先行动";
}

export function InputSpeakerSelect({
  value,
  characters,
  onChange,
}: {
  value: string;
  characters: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">输入身份</span>
      <WorldSelect
        value={value}
        onValueChange={onChange}
        size="sm"
        label="输入身份"
        className="h-6 gap-1 px-2 py-0 text-xs data-[size=sm]:h-6 [&_svg]:size-3"
      >
        <SelectItem value="system" className="py-1 text-xs">
          系统
        </SelectItem>
        <SelectItem value="narrator" className="py-1 text-xs">
          旁白
        </SelectItem>
        {characters.length ? <SelectSeparator /> : null}
        {characters.map((item) => (
          <SelectItem key={item.id} value={item.id} className="py-1 text-xs">
            {item.label}
          </SelectItem>
        ))}
      </WorldSelect>
    </div>
  );
}
