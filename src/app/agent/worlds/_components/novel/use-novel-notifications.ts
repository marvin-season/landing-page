"use client";

import { toast } from "@landing-page/design-system";
import { LoaderCircle } from "lucide-react";
import { createElement, useEffect, useRef } from "react";

export function useNovelNotifications({
  roomKey,
  generationTitle,
  generating,
  onOpenGeneration,
  serverSynced,
}: {
  roomKey: string;
  generationTitle: string | null;
  generating: boolean;
  onOpenGeneration: () => void;
  serverSynced: boolean;
}) {
  const generationId = `novel-generation:${roomKey}`;
  const syncId = `novel-sync:${roomKey}`;
  const generationDismissed = useRef(false);

  useEffect(() => {
    if (generationTitle === null) {
      generationDismissed.current = false;
      toast.dismiss(generationId);
      return;
    }
    if (generationDismissed.current) return;
    toast(generating ? "正在生成" : "查看生成结果", {
      id: generationId,
      duration: Infinity,
      closeButton: true,
      description: generationTitle,
      icon: generating
        ? createElement(LoaderCircle, {
            className: "animate-spin motion-reduce:animate-none",
          })
        : null,
      action: {
        label: generating ? "查看进度" : "打开草稿",
        onClick: onOpenGeneration,
      },
      onDismiss: () => {
        generationDismissed.current = true;
      },
    });
  }, [generating, generationId, generationTitle, onOpenGeneration]);

  useEffect(() => {
    if (serverSynced) {
      toast.success("数据已同步", {
        id: syncId,
        duration: Infinity,
        closeButton: true,
      });
    } else {
      toast.dismiss(syncId);
    }
  }, [serverSynced, syncId]);

  useEffect(
    () => () => {
      toast.dismiss(generationId);
      toast.dismiss(syncId);
    },
    [generationId, syncId],
  );
}
