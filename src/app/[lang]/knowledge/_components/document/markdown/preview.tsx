"use client";

import { Trans } from "@lingui/react/macro";
import { FileText } from "lucide-react";
import DocumentMarkdown from "./renderer";

export default function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4">
        <FileText className="size-4 shrink-0 text-primary" />
        <h2 className="text-sm font-medium">
          <Trans>Document preview</Trans>
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">
          <Trans>Select text to quote</Trans>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/20 p-4 sm:p-6">
        <article
          data-document-content
          className="min-h-full rounded-lg border border-border/40 bg-card p-5 shadow-sm sm:p-8"
        >
          <DocumentMarkdown content={content} />
        </article>
      </div>
    </div>
  );
}
