"use client";

import { Card } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { ExternalLink, Github } from "lucide-react";
import { BookkeepingCard } from "../shared/bookkeeping-layout";

export function SupportCard() {
  return (
    <BookkeepingCard asChild>
      <Card>
        <a
          href="https://github.com/marvin-season/landing-page"
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer text-sm font-medium text-foreground flex min-h-14 items-center gap-2 rounded-xl bg-transparent px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 w-full text-left"
        >
          <Github className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h2 className="min-w-0 flex-1">
            <Trans>支持开源</Trans>
          </h2>
          <ExternalLink
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </a>
      </Card>
    </BookkeepingCard>
  );
}
