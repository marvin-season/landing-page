"use client";

import { Card } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { ExternalLink, Github } from "lucide-react";
import {
  settingsCardCls,
  settingsSummaryCls,
} from "../../_styles/settings-styles";

export function SupportCard() {
  return (
    <Card className={settingsCardCls}>
      <a
        href="https://github.com/marvin-season/landing-page"
        target="_blank"
        rel="noopener noreferrer"
        className={settingsSummaryCls}
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
