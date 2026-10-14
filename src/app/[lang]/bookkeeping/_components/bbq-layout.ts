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

// 保存栏参与布局，由上方内容区承担滚动，不再计算导航和安全区的 fixed 偏移。
export const totalBarCls = cls`
  border-t bg-background px-3 pt-2 pb-2 w-full shrink-0
`;

export const touchCls = cls`min-h-11`;
