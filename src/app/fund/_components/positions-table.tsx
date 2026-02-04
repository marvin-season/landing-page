"use client";

import { MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getAvgCost,
  getPositionProfit,
  getPositionProfitRate,
  useFundStore,
} from "@/store/useFundStore";

type OpenTransaction = (type: "buy" | "sell", code?: string) => void;

export function PositionsTable({
  onOpenTransaction,
}: {
  onOpenTransaction: OpenTransaction;
}) {
  const positions = useFundStore((s) => s.positions);
  const realtimeData = useFundStore((s) => s.realtimeData);
  const removePosition = useFundStore((s) => s.removePosition);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground border-b">
            <tr>
              <th className="px-4 py-3 font-medium">基金</th>
              <th className="px-4 py-3 font-medium">估值 / 涨跌幅</th>
              <th className="px-4 py-3 font-medium">持有份额</th>
              <th className="px-4 py-3 font-medium">成本价</th>
              <th className="px-4 py-3 font-medium">持仓收益</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {positions.map((pos) => {
              const data = realtimeData[pos.fundCode];
              const price =
                data?.gsz != null && data.gsz !== ""
                  ? parseFloat(data.gsz)
                  : undefined;
              const gszzl =
                data?.gszzl != null ? parseFloat(data.gszzl) : undefined;
              const avgCost = getAvgCost(pos);
              const profit = getPositionProfit(pos, price);
              const profitRate = getPositionProfitRate(pos, price);

              return (
                <tr key={pos.fundCode} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{pos.fundName}</div>
                    <div className="text-xs text-muted-foreground">
                      {pos.fundCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{price != null ? price.toFixed(4) : "—"}</div>
                    {gszzl != null && !Number.isNaN(gszzl) && (
                      <span
                        className={cn(
                          "text-xs",
                          gszzl >= 0 ? "text-red-600" : "text-green-600",
                        )}
                      >
                        {gszzl >= 0 ? "+" : ""}
                        {gszzl}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{pos.totalShares.toFixed(2)}</td>
                  <td className="px-4 py-3">{avgCost.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        "font-medium",
                        profit >= 0 ? "text-red-600" : "text-green-600",
                      )}
                    >
                      {price != null ? "¥" + profit.toFixed(2) : "—"}
                    </div>
                    {price != null && (
                      <div
                        className={cn(
                          "text-xs",
                          profitRate >= 0 ? "text-red-600" : "text-green-600",
                        )}
                      >
                        {profitRate >= 0 ? "+" : ""}
                        {profitRate.toFixed(2)}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() => onOpenTransaction("buy", pos.fundCode)}
                      >
                        <PlusCircle className="size-4 mr-1" /> 加仓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700"
                        onClick={() => onOpenTransaction("sell", pos.fundCode)}
                      >
                        <MinusCircle className="size-4 mr-1" /> 卖出
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`确认删除 ${pos.fundName} (${pos.fundCode}) 吗？此操作不可恢复。`)) {
                            removePosition(pos.fundCode);
                          }
                        }}
                      >
                        <Trash2 className="size-4 mr-1" /> 删除
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {positions.length === 0 && (
        <div className="px-4 py-12 text-center text-muted-foreground">
          暂无持仓，点击右上角「添加交易」录入买入
        </div>
      )}
    </div>
  );
}
