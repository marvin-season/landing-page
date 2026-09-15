export type CitationHighlight = {
  target: Element | null;
  clear: () => void;
};

export type CitationHighlighter = (context: {
  page: HTMLDivElement;
  textLayer: HTMLElement;
  range: Range;
  quote: string;
}) => CitationHighlight | undefined;
