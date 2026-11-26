import {
  Button,
  type ButtonProps,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@landing-page/design-system";
import type { ReactElement } from "react";
import type { PlotMode } from "./plot-edit";

type ActionHint = {
  action: string;
  context?: string;
};

export function NovelActionTooltip({
  hint,
  children,
}: {
  hint: ActionHint;
  children: ReactElement;
}) {
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className="z-[60] max-w-72 text-left text-pretty"
      >
        <p className="font-medium">{hint.action}</p>
        <p className="mt-1">
          {hint.context
            ? `生成时发送给 AI：${hint.context}`
            : "不会向 AI 发送内容。"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function NovelActionButton({
  hint,
  ...props
}: ButtonProps & { hint: ActionHint }) {
  const button = <Button {...props} />;
  return (
    <NovelActionTooltip hint={hint}>
      {props.disabled ? <span className="inline-flex">{button}</span> : button}
    </NovelActionTooltip>
  );
}

export const nextChapterActionHint: ActionHint = {
  action: "生成下一章草稿，确认后才加入正文。",
  context:
    "完整世界设定、小说设定、续写要求和目标字数。摘要没有超过续写点时，用摘要替换所覆盖的前文。章间续写也会参考紧接着一章的开头。不带草稿。",
};

export function localActionHint(action: string): ActionHint {
  return { action };
}

export function compactContextHint(selection: boolean): ActionHint {
  return localActionHint(
    selection
      ? "开启后，润色只参考本章和创作设定。"
      : "开启后，下次润色的正文范围只包含本章。",
  );
}

export const stopGenerationHint = localActionHint("停止当前生成。");

export function rewriteHint(selection: boolean, compact: boolean): ActionHint {
  return {
    action: selection
      ? "只生成所选文字的替换稿。"
      : "生成整章替换稿，确认后才更新正文。",
    context: `完整世界设定、小说设定、润色要求和本章已保存正文。${
      selection
        ? compact
          ? "标明选段位置，不带摘要或其他章节。"
          : "标明选段位置；有摘要时附带摘要和未被覆盖的前文，无摘要时附带此前各章的原文。"
        : compact
          ? "不带摘要或其他章节。"
          : "有摘要时附带摘要和未被覆盖的前文，无摘要时附带此前各章的原文。"
    }`,
  };
}

export function plotHint(mode: PlotMode, atStart = false): ActionHint {
  if (mode === "split") {
    return {
      action: "让 AI 选择拆分位置，预览后将一章拆成两章，保留全部原文。",
      context: "完整世界设定、小说设定、所选章的正文和选填的拆分要求。",
    };
  }
  if (mode === "stitch") {
    return {
      action: "只改写前一章结尾和后一章开头，保留两章分界。",
      context:
        "完整世界设定、小说设定、整理要求、前章结尾和后章开头（各约 1200 字符），以及紧邻改写区的原文（每侧最多 600 字符）。",
    };
  }
  if (mode === "merge") {
    return {
      action: "把所选的连续章节压缩成一章。",
      context:
        "完整世界设定、小说设定、整理要求、所选章的完整正文，以及选区外前后章各最多 600 字符的边界片段。",
    };
  }
  return {
    action: atStart ? "在第一章前补写新开篇。" : "在选定的两章之间补写一章。",
    context: atStart
      ? "完整世界设定（含前置剧情）、小说设定、插入要求、目标字数和原第一章的开头。"
      : "完整世界设定、小说设定、插入要求、目标字数及前后两章的完整正文。若已导入背景，也会一起发送。",
  };
}

export const insertionModeHint: ActionHint = {
  action: "在书首或相邻两章之间补写一章。",
  context:
    "两种位置都带完整世界设定、小说设定和写作要求。书首还带原第一章的开头，章间还带相邻两章全文。",
};
