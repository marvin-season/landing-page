"use client";

import { Card, CardContent } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { ChevronDown, ExternalLink, Github } from "lucide-react";
import {
  detailsChevronCls,
  detailsMotionCls,
  detailsSummaryCls,
} from "./bbq-layout";

export function BbqSupportCard() {
  return (
    <Card className="shrink-0 overflow-hidden border-0 shadow-none">
      <details className={detailsMotionCls}>
        <summary className={detailsSummaryCls}>
          <Github className="size-4 shrink-0" aria-hidden="true" />
          <h2 className="min-w-0 flex-1">
            <Trans>支持开源</Trans>
          </h2>
          <ChevronDown className={detailsChevronCls} aria-hidden="true" />
        </summary>
        <div className="min-h-0 overflow-clip">
          <CardContent className="flex flex-col gap-3 px-3 pb-3 pt-1">
            <a
              href="https://github.com/marvin-season/landing-page"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 rounded-lg text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 break-all">
                github.com/marvin-season/landing-page
              </span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            </a>
          </CardContent>
        </div>
      </details>
    </Card>
  );
}
