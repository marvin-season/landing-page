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
      setError("Enter the fund code");
      return;
    }

    if (!validateFundCode(trimmedCode)) {
      setError("The fund code should be 6 digits");
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
              Fund Code
            </label>
            <div className="flex gap-2">
              <Input
                id="fund-code"
                type="text"
                placeholder="Enter the 6-digit fund code, e.g., 025109"
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
                Search
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Data source: East Money/Tian Tian Fund, based on real-time stock
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
