import { Trans } from "@lingui/react/macro";
import {
  FileText,
  Highlighter,
  Languages,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type ChangelogRelease = {
  version: string;
  branch: string;
  date: string;
  current?: boolean;
  icon: LucideIcon;
  title: ReactNode;
  summary: ReactNode;
  highlights: ReactNode[];
};

export const changelogReleases: ChangelogRelease[] = [
  {
    version: "v3",
    branch: "feat/docs-v3-ai",
    date: "2026-09-15",
    current: true,
    icon: Languages,
    title: <Trans>Selection-aware AI</Trans>,
    summary: (
      <Trans>
        A selected passage can be translated or summarized without quoting it
        into the composer first. The knowledge agent receives only the excerpt
        and the instruction.
      </Trans>
    ),
    highlights: [
      <Trans key="toolbar">
        Translate or summarize from the selection toolbar
      </Trans>,
      <Trans key="languages">
        Choose English, Japanese, Korean, or Simplified Chinese as the
        translation target
      </Trans>,
      <Trans key="agent">
        A Mastra knowledge agent streams the reply; throttle mode keeps
        conversations from overlapping
      </Trans>,
    ],
  },
  {
    version: "v2",
    branch: "feat/docs-v2",
    date: "2026-02-15",
    icon: Highlighter,
    title: <Trans>PDF citation highlight</Trans>,
    summary: (
      <Trans>
        Quotes connect back to the PDF. Click a citation to open that page and
        highlight the original sentence by searching the text layer.
      </Trans>
    ),
    highlights: [
      <Trans key="locate">
        Locate a quote without storing selection geometry
      </Trans>,
      <Trans key="highlight">
        Highlight the matching passage on the PDF page
      </Trans>,
      <Trans key="sample">
        Conversations can start with a sample citation for demos
      </Trans>,
    ],
  },
  {
    version: "v1",
    branch: "feat/docs",
    date: "2025-09-11",
    icon: FileText,
    title: <Trans>Document workspace</Trans>,
    summary: (
      <Trans>
        Open a PDF or Markdown file without an account. Select passages, keep
        them as quotes with document name and page number, and start from a
        sample document.
      </Trans>
    ),
    highlights: [
      <Trans key="read">Read PDF and Markdown in one workspace</Trans>,
      <Trans key="quotes">Keep quotes next to your notes</Trans>,
      <Trans key="entry">Homepage Docs entry and a built-in sample file</Trans>,
    ],
  },
];
