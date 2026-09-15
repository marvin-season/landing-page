import { overlayCitationHighlighter } from "./overlay";
import type { CitationHighlighter } from "./types";

const builtIn = {
  overlay: overlayCitationHighlighter,
} as const;

export type Implementation = keyof typeof builtIn | CitationHighlighter;

export const CITATION_HIGHLIGHT_IMPLEMENTATION: Implementation = "overlay";

export function resolveHighlighter(
  implementation: Implementation,
): CitationHighlighter {
  return typeof implementation === "function"
    ? implementation
    : builtIn[implementation];
}
