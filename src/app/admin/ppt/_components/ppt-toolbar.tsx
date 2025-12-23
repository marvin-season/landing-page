"use client";

import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { GeneratedPptItem } from "@/store/ppt-store";
import type { Preset } from "./ppt-presets";

type Props = {
  presetId: string;
  onPresetChange: (presetId: string) => void;
  presets: Preset[];
  isGenerating: boolean;
  onGenerate: () => void;

  dataSourceValue: string;
  onDataSourceValueChange: (value: string) => void;
  generatedPpts: GeneratedPptItem[];
};

export function PptToolbar({
  presetId,
  onPresetChange,
  presets,
  isGenerating,
  onGenerate,
  dataSourceValue,
  onDataSourceValueChange,
  generatedPpts,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-700">提示词</span>
          <Select value={presetId} onValueChange={onPresetChange}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="选择一个内置提示词" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "生成中..." : "生成 PPT"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-700">数据源</span>
        <Select value={dataSourceValue} onValueChange={onDataSourceValueChange}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="选择数据源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mock">Mock（内置）</SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>已生成 PPT（IDB）</SelectLabel>
              {generatedPpts.length === 0 ? (
                <SelectItem value="generated:none" disabled>
                  暂无生成记录
                </SelectItem>
              ) : (
                generatedPpts.map((ppt) => (
                  <SelectItem key={ppt.id} value={`generated:${ppt.id}`}>
                    {ppt.title}（{ppt.slides.length} 页）
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
