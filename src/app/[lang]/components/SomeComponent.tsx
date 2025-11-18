'use client'

import { Trans, useLingui } from "@lingui/react/macro";

export function SomeComponent() {
  const { t } = useLingui();
  return (
    <div>
      <p>
        <Trans>Some Item</Trans>
      </p>
      <p>{t`Other Item`}</p>
    </div>
  );
}