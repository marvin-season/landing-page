"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { validateFundOrStockCode } from "../_utils/fund-types";

function normalizeInputCode(input: string): string {
  const t = input.trim().toLowerCase();
  if (/^(sh|sz)\d{6}$/.test(t)) return t;
  return t;
}

export function FundInput() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError("请输入基金或股票代码");
      return;
    }

    if (!validateFundOrStockCode(trimmedCode)) {
      setError("代码格式：6位基金代码 或 sh/sz+6位股票代码，如 sh600519");
      return;
    }

    const normalized = normalizeInputCode(trimmedCode);
    router.push(`/fund/${normalized}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="fund-code"
              className="text-sm font-medium text-foreground"
            >
              基金 / 股票代码
            </label>
            <div className="flex gap-2">
              <Input
                id="fund-code"
                type="text"
                placeholder="基金如 025109，股票如 sh600519 / sz000001"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                maxLength={12}
                className="flex-1"
                aria-invalid={!!error}
              />
              <Button type="submit" size="md">
                <Search className="size-4" />
                查询
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              基金：东方财富；股票/ETF：新浪财经（参考
              <a
                href="https://www.juhe.cn/news/index/id/7854"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline ml-1"
              >
                聚合数据
              </a>
              ）
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
