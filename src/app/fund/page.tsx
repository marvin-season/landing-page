"use client";

import { PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFundStore } from "@/store/useFundStore";
import { OverviewCards } from "./_components/overview-cards";
import { PositionsTable } from "./_components/positions-table";
import { TransactionModal } from "./_components/transaction-modal";

export default function FundPage() {
  const syncEstimations = useFundStore((s) => s.syncEstimations);
  const positions = useFundStore((s) => s.positions);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"buy" | "sell">("buy");
  const [modalCode, setModalCode] = useState("");

  useEffect(() => {
    if (positions.length > 0) {
      syncEstimations()
        .then((r) => {
          if (r && !r.ok && r.errors?.length) setSyncError(r.errors[0]);
          else setSyncError(null);
        })
        .catch(() => setSyncError("同步失败"));
    }
  }, [positions.length, syncEstimations]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    const r = await syncEstimations();
    if (r && !r.ok && r.errors?.length) setSyncError(r.errors.join("；"));
    setSyncing(false);
  };

  const openTransaction = (type: "buy" | "sell", code?: string) => {
    setModalType(type);
    setModalCode(code ?? "");
    setModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">基金估值与持仓</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || positions.length === 0}
            >
              <RefreshCw
                className={cn("size-4 mr-2", syncing && "animate-spin")}
              />
              {syncing ? "同步中…" : "刷新估值"}
            </Button>
            <Button size="sm" onClick={() => openTransaction("buy")}>
              <PlusCircle className="size-4 mr-2" />
              添加交易
            </Button>
          </div>
        </div>

        {syncError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            {syncError}
          </div>
        )}

        <div className="space-y-6">
          <OverviewCards />
          <PositionsTable onOpenTransaction={openTransaction} />
        </div>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialType={modalType}
        initialCode={modalCode}
      />
    </div>
  );
}
