"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { validateFundCode } from "../_utils/fund-types";

export function FundInput() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError("请输入基金代码");
      return;
    }

    if (!validateFundCode(trimmedCode)) {
      setError("基金代码应为 6 位数字，如 000001");
      return;
    }

    router.push(`/fund/${trimmedCode}`);
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
              基金代码
            </label>
            <div className="flex gap-2">
              <Input
                id="fund-code"
                type="text"
                placeholder="输入 6 位基金代码，如 000001、025109"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                maxLength={6}
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
              数据来源：东方财富 / 天天基金，估算基于重仓股实时行情
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
