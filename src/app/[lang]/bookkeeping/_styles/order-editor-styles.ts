import { cls, detailsMotionCls } from "./bbq-layout";
import { settingsCardCls } from "./bbq-settings-styles";

export const editorWorkspaceCls = cls`
  grid min-h-0 flex-1 overflow-hidden
  grid-rows-[minmax(0,1fr)_auto]
`;

export const editorMenuPaneCls = cls`
  min-h-0 min-w-0 ${detailsMotionCls} ${settingsCardCls}
`;

export const editorItemToolbarCls = cls`
  flex min-w-0 items-center gap-1.5
  [&_[data-slot=input]]:h-9 [&_[data-slot=input]]:pr-9
  [&_[data-slot=input]]:bg-muted/30 [&_[data-slot=input]]:placeholder:text-xs
  [&_[data-slot=select-trigger]]:h-9 [&_[data-slot=select-trigger]]:w-24
  [&_[data-slot=select-trigger]]:px-2 [&_[data-slot=select-trigger]]:text-xs
  [&_[data-slot=select-trigger]]:bg-transparent
`;

export const editorSectionCls = cls`${settingsCardCls} p-3`;

export const editorOrderBodyCls = cls`min-h-0 flex flex-col gap-3 overflow-y-auto overscroll-y-contain p-3`;

export const editorCartPanelCls = cls`
  absolute inset-x-0 bottom-0 max-h-[92%] grid grid-rows-[auto_minmax(0,1fr)]
  rounded-t-2xl border border-b-0 border-border/60 bg-background shadow-lg
  data-[state=open]:animate-in data-[state=closed]:animate-out
  data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom
  duration-200 motion-reduce:animate-none
`;

export const editorControlCls = cls`
  rounded-lg shadow-none transition-colors
  hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 focus-visible:ring-offset-0
  shinchan:rounded-lg
`;
