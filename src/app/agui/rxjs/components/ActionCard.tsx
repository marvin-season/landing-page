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
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2 pt-6 sm:pt-6">
        <div className="space-y-1.5 min-w-0">
          <CardTitle className="text-base font-medium">操作</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
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
