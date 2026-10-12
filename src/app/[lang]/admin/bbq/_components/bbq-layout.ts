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

// 保存栏始终位于 4rem 主导航和底部安全区之上。
export const totalBarCls = cls`
  fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t
  bg-background px-3 pt-2 pb-2 mx-auto w-full max-w-xl
  pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]
`;

export const touchCls = cls`min-h-11`;
