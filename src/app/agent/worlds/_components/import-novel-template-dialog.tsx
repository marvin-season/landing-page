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
  Input,
  Tag,
} from "@landing-page/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { BookUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/shadcn-io/tabs";
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldConfig, WorldKind, WorldRoom } from "@/lib/group-chat/model";
import {
  maxTemplateNovelFileBytes,
  type WorldTemplate,
} from "@/lib/group-chat/world-template-model";
import { createImportedNovel, parseNovelFile } from "./novel/import-novel";
import { addNovelCopy } from "./novel/use-novel-storage";

type Extracted = {
  template: WorldTemplate;
};

export function ImportNovelTemplateDialog({
  disabled,
  onUseTemplate,
}: {
  disabled?: boolean;
  onUseTemplate: (config: WorldConfig, kind: WorldKind) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WorldKind>("novel");
  const [model, setModel] = useState("cursor/auto");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [savedPath, setSavedPath] = useState("");
  const [savedRoomId, setSavedRoomId] = useState("");

  function reset() {
    setFileName("");
    setText("");
    setPending(false);
    setError("");
    setExtracted(null);
    setSavedPath("");
    setSavedRoomId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onPickFile(file: File | undefined) {
    setError("");
    setExtracted(null);
    setSavedPath("");
    setSavedRoomId("");
    if (!file) return;
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

  async function extract() {
    if (!text) {
      setError("请先选择小说文件");
      return;
    }
    setPending(true);
    setError("");
    setExtracted(null);
    setSavedPath("");
    setSavedRoomId("");
    try {
      const result = await worldRequest<Extracted>(
        "templates/extract",
        "POST",
        {
          text,
          kind,
          model: model.trim() || "cursor/auto",
          fileName,
        },
      );
      setExtracted(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提取失败");
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!extracted || !text) return;
    setPending(true);
    setError("");
    try {
      const imported = parseNovelFile(text, fileName || "novel.txt");
      const novel = createImportedNovel(extracted.template.config, imported);
      const created = await worldRequest<{ room: WorldRoom }>("rooms", "POST", {
        ...extracted.template.config,
        kind: "novel",
      });
      await addNovelCopy(`${created.room.ownerId}:${created.room.id}`, {
        ...novel,
        updatedAt: Date.now(),
      });
      setSavedRoomId(created.room.id);
      void queryClient.invalidateQueries({ queryKey: ["world-rooms"] });

      try {
        const result = await worldRequest<{ path: string; id: string }>(
          "templates",
          "POST",
          {
            id: extracted.template.id,
            description: extracted.template.description,
            details: extracted.template.details,
            gradient: extracted.template.gradient,
            kind: extracted.template.kind,
            config: extracted.template.config,
            sourceRoomId: created.room.id,
          },
        );
        setSavedPath(result.path);
        router.refresh();
      } catch (templateError) {
        setError(
          templateError instanceof Error
            ? `小说已收录到「我的作品」，但模板保存失败：${templateError.message}`
            : "小说已收录到「我的作品」，但模板保存失败",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
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
        从小说生成模板
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[min(90dvh,40rem)] gap-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b border-border pr-12">
            <DialogTitle>从小说生成模板</DialogTitle>
            <DialogDescription>
              导入不超过 2MB 的 TXT / Markdown。AI
              逆向提取世界设定并保存为本地模板，同时把正文收录到「我的作品」。
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            {error ? (
              <Alert className="text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                模板类型
              </p>
              <Tabs
                value={kind}
                onValueChange={(value) => {
                  if (value === "script" || value === "novel") setKind(value);
                }}
              >
                <TabsList aria-label="模板类型">
                  <TabsTrigger type="button" value="novel">
                    小说
                  </TabsTrigger>
                  <TabsTrigger type="button" value="script">
                    剧本
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              写作模型
              <Input
                value={model}
                disabled={pending}
                onChange={(event) => setModel(event.target.value)}
                placeholder="cursor/auto"
              />
            </label>
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
            {extracted ? (
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium">
                    {extracted.template.config.title}
                  </h3>
                  <Tag size="compact">
                    {extracted.template.kind === "novel" ? "小说" : "剧本"}
                  </Tag>
                  <Tag size="compact">{extracted.template.id}</Tag>
                </div>
                <p className="text-xs text-muted-foreground">
                  {extracted.template.details}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {extracted.template.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {extracted.template.config.characters.length} 位角色：
                  {extracted.template.config.characters
                    .map((character) => character.name)
                    .join("、")}
                </p>
                {savedRoomId ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {savedPath
                      ? `已收录到「我的作品」，模板已保存到 ${savedPath}。`
                      : "已收录到「我的作品」。"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter className="shrink-0 border-t border-border sm:justify-between">
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              关闭
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={pending || !text}
                onClick={() => void extract()}
              >
                {pending && !extracted ? "正在提取…" : "AI 提取"}
              </Button>
              {extracted ? (
                savedRoomId ? (
                  <Button
                    disabled={pending}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/agent/worlds/${savedRoomId}`);
                    }}
                  >
                    打开作品
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        onUseTemplate(
                          extracted.template.config,
                          extracted.template.kind,
                        );
                        setOpen(false);
                      }}
                    >
                      仅用设定创建
                    </Button>
                    <Button disabled={pending} onClick={() => void save()}>
                      {pending ? "正在保存…" : "保存模板并收录"}
                    </Button>
                  </>
                )
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
