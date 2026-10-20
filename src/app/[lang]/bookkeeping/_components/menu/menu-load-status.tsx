import { Button } from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";

export function MenuLoadStatus({
  phase,
  onRetry,
}: {
  phase: "loading" | "ready" | "error";
  onRetry: () => void;
}) {
  return (
    <div
      className="py-6 text-center text-sm text-muted-foreground"
      role="status"
    >
      {phase === "error" ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          <Trans>Retry</Trans>
        </Button>
      ) : (
        <Trans>读取常用项目中…</Trans>
      )}
    </div>
  );
}
