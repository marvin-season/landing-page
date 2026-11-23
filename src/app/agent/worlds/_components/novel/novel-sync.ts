export type NovelSyncDivergence = "local" | "server" | "both" | "unknown";

export type NovelSyncStatus =
  | { kind: "none" }
  | { kind: "match"; updatedAt: number }
  | {
      kind: "diverged";
      reason: NovelSyncDivergence;
      serverUpdatedAt: number;
    };

export function novelSyncStatus(
  local: { updatedAt?: number; syncedAt?: number },
  server: { text: string; updatedAt: number } | null,
  localText: string,
): NovelSyncStatus {
  if (!server) return { kind: "none" };
  const sameText = localText === server.text;
  if (local.syncedAt == null || local.updatedAt == null) {
    if (sameText) return { kind: "match", updatedAt: server.updatedAt };
    return {
      kind: "diverged",
      reason: "unknown",
      serverUpdatedAt: server.updatedAt,
    };
  }
  const localChanged = local.updatedAt !== local.syncedAt;
  const serverChanged = server.updatedAt !== local.syncedAt;
  if (!localChanged && !serverChanged && sameText) {
    return { kind: "match", updatedAt: local.syncedAt };
  }
  if (localChanged && serverChanged) {
    return {
      kind: "diverged",
      reason: "both",
      serverUpdatedAt: server.updatedAt,
    };
  }
  if (localChanged) {
    return {
      kind: "diverged",
      reason: "local",
      serverUpdatedAt: server.updatedAt,
    };
  }
  if (serverChanged) {
    return {
      kind: "diverged",
      reason: "server",
      serverUpdatedAt: server.updatedAt,
    };
  }
  return {
    kind: "diverged",
    reason: "unknown",
    serverUpdatedAt: server.updatedAt,
  };
}
