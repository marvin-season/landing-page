"use client";

import { useLocalStorageState } from "ahooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TradeAction = "buy" | "sell";

interface TradeRecord {
  id: string;
  date: string;
  symbol: string;
  action: TradeAction;
  price: number;
  quantity: number;
  note: string;
  createdAt: string;
}

interface TradeDraft {
  date: string;
  symbol: string;
  action: TradeAction;
  price: string;
  quantity: string;
  note: string;
}

const fieldClassName =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

function createEmptyDraft(): TradeDraft {
  return {
    date: new Date().toISOString().slice(0, 10),
    symbol: "",
    action: "buy",
    price: "",
    quantity: "",
    note: "",
  };
}

export default function AdminTradesPage() {
  const [records, setRecords] = useLocalStorageState<TradeRecord[]>(
    "admin-stock-trades",
    {
      defaultValue: [],
      listenStorageChange: true,
    },
  );
  const [draft, setDraft] = useState<TradeDraft>(() => createEmptyDraft());

  const sortedRecords = useMemo(() => {
    return [...(records ?? [])].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [records]);

  const totalAmount = useMemo(() => {
    return sortedRecords.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
  }, [sortedRecords]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const symbol = draft.symbol.trim().toUpperCase();
    const price = Number(draft.price);
    const quantity = Number(draft.quantity);

    if (!symbol || price <= 0 || quantity <= 0) {
      return;
    }

    const newRecord: TradeRecord = {
      id: crypto.randomUUID(),
      date: draft.date,
      symbol,
      action: draft.action,
      price,
      quantity,
      note: draft.note.trim(),
      createdAt: new Date().toISOString(),
    };

    setRecords((current) => [newRecord, ...(current ?? [])]);
    setDraft(createEmptyDraft());
  };

  const handleDelete = (id: string) => {
    setRecords((current) => (current ?? []).filter((item) => item.id !== id));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Admin / Trades</p>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              炒股交易记录
            </h1>
            <p className="text-sm text-slate-600">
              极简版本，仅保存在当前浏览器本地。
            </p>
          </div>
        </div>
        <Link
          href="/admin"
          className="text-sm text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          返回 admin
        </Link>
      </div>

      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
        <p className="text-sm font-medium text-amber-900">纪律提醒</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          贪婪会随着资金一起放大，今天的盈利也可能因为贪念全部亏回去。每次下单前先问自己：
          这是按计划执行，还是被贪欲推动？
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">日期</span>
              <Input
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                股票代码
              </span>
              <Input
                placeholder="AAPL / TSLA"
                value={draft.symbol}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    symbol: event.target.value,
                  }))
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">方向</span>
              <select
                className={fieldClassName}
                value={draft.action}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    action: event.target.value as TradeAction,
                  }))
                }
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">价格</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="100.50"
                value={draft.price}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">数量</span>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="100"
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">备注</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:border-slate-400"
              placeholder="可选，记录策略、原因、复盘点。"
              value={draft.note}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              已记录 {sortedRecords.length} 笔，累计成交额{" "}
              {totalAmount.toFixed(2)}
            </p>
            <Button type="submit">新增记录</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        {sortedRecords.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            还没有交易记录，先录入第一笔吧。
          </div>
        ) : (
          sortedRecords.map((record) => {
            const amount = record.price * record.quantity;

            return (
              <article
                key={record.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-slate-900">
                        {record.symbol}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          record.action === "buy"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {record.action === "buy" ? "买入" : "卖出"}
                      </span>
                      <span className="text-sm text-slate-500">
                        {record.date}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <p>价格: {record.price}</p>
                      <p>数量: {record.quantity}</p>
                      <p>成交额: {amount.toFixed(2)}</p>
                    </div>

                    {record.note ? (
                      <p className="text-sm leading-6 text-slate-600">
                        {record.note}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(record.id)}
                  >
                    删除
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
