"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@landing-page/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { BookUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";
import { standaloneNovelConfig } from "@/lib/group-chat/standalone-novel-config";
import { maxTemplateNovelFileBytes } from "@/lib/group-chat/world-template-model";
import { createImportedNovel, parseNovelFile } from "./novel/import-novel";
import { addNovelCopy } from "./novel/use-novel-storage";

export function ImportNovelTemplateDialog({
  disabled,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setFileName("");
    setText("");
    setPending(false);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onPickFile(file: File | undefined) {
    setError("");
    if (!file) return;
    setFileName("");
    setText("");
    if (file.size > maxTemplateNovelFileBytes) {
      setError("小说文件不能超过 2MB");
      return;
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("请选择 TXT 或 Markdown（.md）文件");
      return;
    }
    const source = await file.text();
    const normalized = source
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n")
      .trim();
    if (!normalized) {
      setError("小说文件为空");
      return;
    }
    setFileName(file.name);
    setText(normalized);
  }

  async function importNovel() {
    if (!text) {
      setError("请先选择小说文件");
      return;
    }
    setPending(true);
    setError("");
    try {
      const parsed = parseNovelFile(text, fileName || "novel.txt");
      const config = standaloneNovelConfig(parsed.title);
      const novel = createImportedNovel(config, parsed);
      const created = await worldRequest<{ room: WorldRoom }>("rooms", "POST", {
        ...config,
        kind: "novel",
      });
      try {
        await addNovelCopy(`${created.room.ownerId}:${created.room.id}`, {
          ...novel,
          updatedAt: Date.now(),
        });
      } catch {
        try {
          await worldRequest(`rooms/${created.room.id}`, "DELETE");
        } catch {
          void queryClient.invalidateQueries({ queryKey: ["world-rooms"] });
          throw new Error("正文未能保存，空作品也未能清理。请在作品列表删除空作品后重试。");
        }
        throw new Error("正文未能保存到本机。请检查浏览器存储空间后重试。");
      }
      void queryClient.invalidateQueries({ queryKey: ["world-rooms"] });
      setOpen(false);
      reset();
      router.push(`/agent/worlds/${created.room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <BookUp data-icon="inline-start" />
        导入小说
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[min(90dvh,32rem)] gap-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border pr-12">
            <DialogTitle>导入小说</DialogTitle>
            <DialogDescription>
              导入不超过 2MB 的 TXT /
              Markdown，正文收录到「我的作品」。设定使用默认占位，可在作品右上角「设定」中自行填写，或从正文更新。
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            {error ? (
              <Alert className="text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  小说文件
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => fileRef.current?.click()}
                >
                  选择文件
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={(event) => {
                  void onPickFile(event.target.files?.[0]).catch((e) =>
                    setError(e instanceof Error ? e.message : "读取失败"),
                  );
                  event.target.value = "";
                }}
              />
              <p className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {fileName
                  ? `${fileName} · ${[...text].length.toLocaleString("zh-CN")} 字`
                  : "尚未选择文件"}
              </p>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border sm:justify-between">
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              disabled={pending || !text}
              onClick={() => void importNovel()}
            >
              {pending ? "正在导入…" : "导入并打开"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
