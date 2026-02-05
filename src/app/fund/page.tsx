"use client";

import { PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFundStore } from "@/store/useFundStore";
import { OverviewCards } from "./_components/overview-cards";
import { PositionsTable } from "./_components/positions-table";
import { TransactionModal } from "./_components/transaction-modal";

const disclaimer =
  "免责声明：本应用仅供学习交流使用。行情数据来源网络，可能存在延迟或误差，不构成任何投资建议。投资有风险，入市需谨慎。";

export default function FundPage() {
  const syncEstimations = useFundStore((s) => s.syncEstimations);
  const positions = useFundStore((s) => s.positions);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"buy" | "sell">("buy");
  const [modalCode, setModalCode] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (sessionStorage.getItem("fund_auth") === "true" ||
        localStorage.getItem("permanent_auth") === "true")
    ) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && positions.length > 0) {
      syncEstimations()
        .then((r) => {
          if (r && !r.ok && r.errors?.length) setSyncError(r.errors[0]);
          else setSyncError(null);
        })
        .catch(() => setSyncError("同步失败"));
    }
  }, [isAuthenticated, positions.length, syncEstimations]);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const bjDate = new Date(utc + 3600000 * 8);

    const yy = String(bjDate.getFullYear()).slice(-2);
    const mm = String(bjDate.getMonth() + 1).padStart(2, "0");
    const dd = String(bjDate.getDate()).padStart(2, "0");
    const hh = String(bjDate.getHours()).padStart(2, "0");

    const correctPassword = `${yy}${mm}${dd}${hh}`;
    console.log(disclaimer, correctPassword);
    if (password === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem("fund_auth", "true");
      if (password === "nextjs") {
        localStorage.setItem("permanent_auth", "true");
      }
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  if (!isAuthenticated && process.env.NODE_ENV !== "development") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 text-center"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">访问验证</h1>
            <p className="text-sm text-muted-foreground uppercase">
              display in console (YYMMDDHH)
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="密码"
            autoFocus
          />
          {authError && <p className="text-sm text-red-500">密码错误</p>}
          <Button type="submit" className="w-full">
            进入
          </Button>
        </form>
      </div>
    );
  }

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
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>{disclaimer}</p>
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
