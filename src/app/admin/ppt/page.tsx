"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { usePptStore } from "@/store/ppt-store";
import { PptCanvasPlayer } from "./_components/ppt-canvas-player";
import { PRESETS } from "./_components/ppt-presets";
import { PptToolbar } from "./_components/ppt-toolbar";
import { SLIDES_DATA } from "./data";
import {
  fabricSlidesDocumentSchema,
  normalizeFabricSlideJSON,
} from "./fabric-slide-schema";

export default function SimplePPTPlayer() {
  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? "low-carbon");
  const [dataSource, setDataSource] = useState<"mock" | "generated">("mock");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    activeGeneratedPptId,
    generatedPpts,
    addGeneratedPpt,
    setActiveGeneratedPptId,
  } = usePptStore();

  const activeGeneratedPpt =
    activeGeneratedPptId == null
      ? null
      : (generatedPpts.find((p) => p.id === activeGeneratedPptId) ?? null);

  const dataSourceSelectValue = useMemo(() => {
    if (dataSource === "mock") return "mock";
    if (activeGeneratedPptId) return `generated:${activeGeneratedPptId}`;
    return "mock";
  }, [activeGeneratedPptId, dataSource]);

  const activeSlides =
    dataSource === "generated" && activeGeneratedPpt
      ? activeGeneratedPpt.slides
      : SLIDES_DATA;

  const onGenerate = async () => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: preset.topic,
          slideCount: preset.slideCount,
          tone: preset.tone,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `生成失败（HTTP ${res.status}）`);
      }

      const json = await res.json();
      const parsed = fabricSlidesDocumentSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          "返回数据不符合 PPT schema，请检查模型输出/服务端约束。",
        );
      }

      const slides = parsed.data.slides.map(normalizeFabricSlideJSON);
      addGeneratedPpt({
        slides,
        presetId: preset.id,
        title: preset.label,
      });

      setDataSource("generated");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-xl">简易 Web PPT 渲染器</CardTitle>

            <PptToolbar
              presetId={presetId}
              onPresetChange={setPresetId}
              presets={PRESETS}
              isGenerating={isGenerating}
              onGenerate={onGenerate}
              dataSourceValue={dataSourceSelectValue}
              onDataSourceValueChange={(v) => {
                if (v === "mock") {
                  setDataSource("mock");
                  return;
                }

                if (v.startsWith("generated:")) {
                  const id = v.slice("generated:".length);
                  setDataSource("generated");
                  setActiveGeneratedPptId(id);
                  return;
                }

                setDataSource("mock");
              }}
              generatedPpts={generatedPpts}
            />
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4">
            {errorMsg ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertTitle>生成失败</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex w-full flex-col gap-2">
              {dataSource === "generated" && activeGeneratedPpt ? (
                <div className="text-sm text-slate-600">
                  当前使用生成数据：{activeGeneratedPpt.title}（
                  {activeGeneratedPpt.slides.length} 页）
                  <span className="ml-2 text-slate-500">
                    生成时间：
                    {new Date(activeGeneratedPpt.createdAt).toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  当前使用 Mock 数据（{SLIDES_DATA.length} 页）
                </div>
              )}
            </div>

            <PptCanvasPlayer
              slides={activeSlides}
              slidesKey={dataSourceSelectValue}
            />

            <p className="text-sm text-gray-500 mt-2">
              提示：Mock 数据保留；生成数据会写入 zustand +
              IndexedDB（IDB）并可切换预览
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
