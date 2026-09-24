"use client";

import { Button } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AuthorizationSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <span className="inline-flex animate-spin" aria-hidden="true">
            <Loader2 className="size-4" />
          </span>
          <Trans>Authorizing…</Trans>
        </>
      ) : (
        <Trans>Authorize and continue</Trans>
      )}
    </Button>
  );
}
