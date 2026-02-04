"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useFundStore } from "@/store/useFundStore";

type TransactionType = "buy" | "sell";

type Props = {
  open: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  initialCode?: string;
};

export function TransactionModal({
  open,
  onClose,
  initialType = "buy",
  initialCode = "",
}: Props) {
  const { positions, addTransaction } = useFundStore();
  const [type, setType] = useState<TransactionType>(initialType);
  const [fundCode, setFundCode] = useState(initialCode);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setFundCode(initialCode);
      setAmount("");
      setPrice("");
      setDate(new Date().toISOString().slice(0, 10));
      setError(null);
    }
  }, [open, initialType, initialCode]);

  const fundName =
    positions.find((p) => p.fundCode === fundCode)?.fundName ??
    (fundCode ? "未知" : "");

  const fetchHistoryPrice = async () => {
    if (!fundCode.trim()) {
       setError("请先输入基金代码");
       return null;
    }
    setFetchingPrice(true);
    setError(null);
    try {
        const res = await fetch(`/api/proxy?code=${fundCode.trim()}&type=history&date=${date}`);
        const data = await res.json();
        if (res.ok && data.dwjz) {
            setPrice(data.dwjz);
            return data.dwjz;
        } else {
            setError(data.error || "无法获取该日净值，请确认代码和日期，或手动输入");
            return null;
        }
    } catch {
        setError("查询净值失败，请手动输入");
        return null;
    } finally {
        setFetchingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    let numPrice = parseFloat(price);

    if (!fundCode.trim()) {
      setError("请输入基金代码");
      return;
    }
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setError("请输入有效金额");
      return;
    }

    setLoading(true);

    // If price is missing, try to fetch it automatically
    if (Number.isNaN(numPrice) || numPrice <= 0) {
        const fetched = await fetchHistoryPrice();
        if (fetched) {
            numPrice = parseFloat(fetched);
        } else {
            setLoading(false);
            return; // Error already set by fetchHistoryPrice
        }
    }

    const shares = numAmount / numPrice;
    
    try {
      addTransaction({
        type,
        fundCode: fundCode.trim(),
        fundName: fundName || fundCode.trim(),
        amount: numAmount,
        price: numPrice,
        shares,
        date,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === "buy" ? "买入" : "卖出"}基金</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">交易类型</label>
            <div className="flex rounded-lg border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setType("buy")}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium",
                  type === "buy"
                    ? "bg-background shadow text-red-600"
                    : "text-muted-foreground",
                )}
              >
                买入
              </button>
              <button
                type="button"
                onClick={() => setType("sell")}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium",
                  type === "sell"
                    ? "bg-background shadow text-green-600"
                    : "text-muted-foreground",
                )}
              >
                卖出
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">基金代码</label>
            <input
              type="text"
              value={fundCode}
              onChange={(e) => setFundCode(e.target.value)}
              placeholder="例如 001186"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            {positions.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                已有持仓：{positions.map((p) => p.fundCode).join("、")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {type === "buy" ? "金额(元)" : "金额(元)"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">单价</label>
                <button
                  type="button"
                  onClick={fetchHistoryPrice}
                  disabled={fetchingPrice || !fundCode}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {fetchingPrice ? "查询中..." : "查询净值"}
                </button>
              </div>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="留空自动查询"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">交易日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中…" : "确认"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
