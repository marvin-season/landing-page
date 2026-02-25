"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ActionCardProps = {
  messageId: string | null;
  loading: boolean;
  onSend: () => void;
};

export function ActionCard({ messageId, loading, onSend }: ActionCardProps) {
  return (
    <Card className="border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 px-6 py-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="text-base font-medium">操作</CardTitle>
          <CardDescription className="truncate text-xs text-muted-foreground sm:whitespace-normal">
            {messageId != null
              ? `当前 messageId: ${messageId}`
              : "点击按钮发送示例请求"}
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={onSend}
          disabled={loading}
          size="md"
          className="shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              请求中…
            </>
          ) : (
            "查询北京天气"
          )}
        </Button>
      </CardHeader>
    </Card>
  );
}
