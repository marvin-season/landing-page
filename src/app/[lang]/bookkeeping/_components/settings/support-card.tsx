"use client";

import { Card, detailsSummaryVariants } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { ExternalLink, Github } from "lucide-react";
import { settingsCardCls } from "../../_styles/settings-styles";

export function SupportCard() {
  return (
    <Card className={settingsCardCls}>
      <a
        href="https://github.com/marvin-season/landing-page"
        target="_blank"
        rel="noopener noreferrer"
        className={detailsSummaryVariants({ variant: "flush" })}
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
  );
}
