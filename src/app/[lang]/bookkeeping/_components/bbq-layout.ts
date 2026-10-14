export function cls(
  strings: TemplateStringsArray,
  ...values: Array<string | number | false | null | undefined>
): string {
  return strings
    .reduce((result, part, index) => {
      const value = values[index];
      return result + part + (value ? String(value) : "");
    }, "")
    .replace(/\s+/g, " ")
    .trim();
}

// BBQ 各页面与底部操作区共用窄屏宽度，PC 直接复用 H5 布局。
export const pageShellCls = cls`flex flex-col gap-3`;

export const pageTitleCls = cls`text-2xl font-semibold text-foreground pr-24 tracking-tight`;

export const detailsMotionCls = cls`
  group/details
  [&::details-content]:grid [&::details-content]:grid-rows-[0fr]
  [&::details-content]:transition-[grid-template-rows,content-visibility]
  [&::details-content]:duration-200 [&::details-content]:ease-out
  [&::details-content]:transition-discrete [&[open]::details-content]:grid-rows-[1fr]
  motion-reduce:[&::details-content]:transition-none
`;

export const detailsSummaryCls = cls`
  cursor-pointer text-sm font-medium text-foreground
  flex min-h-11 items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2
  list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-muted/70
  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 group-open/details:bg-muted/70
`;

export const detailsChevronCls = cls`
  size-4 shrink-0 text-muted-foreground transition-transform duration-200
  group-open/details:rotate-180 motion-reduce:transition-none
`;

// 保存栏参与布局，由上方内容区承担滚动，不再计算导航和安全区的 fixed 偏移。
export const totalBarCls = cls`
  border-t bg-background px-3 pt-2 pb-2 w-full shrink-0
`;

export const touchCls = cls`min-h-11`;
