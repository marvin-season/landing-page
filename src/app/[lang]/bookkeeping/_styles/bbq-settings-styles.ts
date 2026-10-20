import { cls } from "./bbq-layout";

// 设置页的样式基准；常用项目复用卡片和标题样式，保持折叠入口一致。
export const settingsCardCls = cls`
  overflow-hidden rounded-xl bg-card shrink-0 border border-border/60
  text-card-foreground shadow-none
`;

export const settingsSummaryCls = cls`
  cursor-pointer text-sm font-medium text-foreground
  flex min-h-14 items-center gap-2 rounded-none bg-transparent px-3 py-2
  list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-muted/40
  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50
`;

export const settingsActionCls = cls`
  min-h-11 w-full justify-center rounded-lg px-3 text-sm shadow-none
  hover:bg-muted/70 hover:shadow-none focus-visible:ring-inset
  border border-border/60 bg-muted/30 text-foreground
`;

export const settingsInputCls = cls`
  h-11 rounded-lg border-border/60 bg-muted/30 shadow-none
  focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20
  dark:bg-muted/30 shinchan:bg-muted/30 apple:bg-muted/30 apple:backdrop-blur-none
`;
