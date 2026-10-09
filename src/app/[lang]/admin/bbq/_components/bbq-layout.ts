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

export const pageShellCls = cls`
  flex flex-col gap-3
  md:h-[calc(100dvh-2rem)] md:overflow-hidden
  lg:h-[calc(100dvh-10rem)]
`;

export const splitCls = cls`
  flex min-h-0 flex-1 flex-col gap-4
  md:grid md:grid-cols-2
`;

export const menuPaneCls = cls`
  order-2 min-h-0 min-w-0 pb-36
  md:order-1 md:overflow-auto md:pb-0
`;

export const orderPaneCls = cls`
  order-1 flex min-h-0 min-w-0 flex-col
  md:order-2 md:h-full
`;

export const orderBodyCls = cls`
  min-h-0 pb-36
  md:flex-1 md:overflow-auto md:pb-0
`;

export const totalBarCls = cls`
  fixed inset-x-0 bottom-0 z-20 border-t bg-background px-3 pt-2
  pb-[calc(0.5rem+env(safe-area-inset-bottom))]
  md:static md:inset-auto md:z-auto md:pb-2
`;

export const detailPaneCls = cls`
  hidden min-h-0 min-w-0
  md:flex md:h-full md:flex-col
`;

export const listPaneCls = cls`min-h-0 min-w-0 md:overflow-auto`;

export const editorTotalCls = cls`text-3xl font-semibold tabular-nums`;

export const cardTotalCls = cls`text-2xl font-semibold tabular-nums`;

export const inputCls = cls`h-11 text-base md:text-base`;

export const cellInputCls = cls`
  h-11 w-full min-w-0 rounded-none border-0 bg-transparent px-2
  text-base shadow-none md:text-base
`;

export const touchCls = cls`min-h-11`;

export const navLinkCls = cls`
  inline-flex min-h-11 items-center justify-center rounded-full border
  bg-card px-4 text-base text-foreground
`;
