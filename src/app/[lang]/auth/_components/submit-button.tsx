"use client";

import { Button } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { useFormStatus } from "react-dom";

export function AuthorizationSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="mt-2 w-full" disabled={pending}>
      {pending ? (
        <Trans>Authorizing…</Trans>
      ) : (
        <Trans>Authorize and continue</Trans>
      )}
    </Button>
  );
}
