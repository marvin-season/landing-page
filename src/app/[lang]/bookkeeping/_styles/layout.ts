import { cn as cls } from "@landing-page/utils";

// biome-ignore lint/performance/noBarrelFile: Preserve the existing cls imports through the shared cn utility.
export { cn as cls } from "@landing-page/utils";

// 记账各页面与底部操作区共用窄屏宽度，PC 直接复用 H5 布局。
export const pageShellCls = cls`flex flex-col gap-3`;

export const pageTitleCls = cls`text-2xl font-semibold text-foreground tracking-tight`;

export const touchCls = cls`min-h-11`;
