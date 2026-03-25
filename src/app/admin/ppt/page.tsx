"use client";

import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePptStore } from "@/store/ppt-store";
import { PptCanvasPlayer } from "./_components/ppt-canvas-player";
import { PRESETS } from "./_components/ppt-presets";
import { PptToolbar } from "./_components/ppt-toolbar";
import SLIDES_DATA from "./data";
import {
  type FabricSlideJSON,
  normalizeFabricSlideJSON,
} from "./fabric-slide-schema";

export default function SimplePPTPlayer() {
  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? "low-carbon");
  const [dataSource, setDataSource] = useState<"mock" | "generated">("mock");

  const {
    activeGeneratedPptId,
    generatedPpts,
    addGeneratedPpt,
    setActiveGeneratedPptId,
  } = usePptStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const activeGeneratedPpt =
    activeGeneratedPptId == null
      ? null
      : (generatedPpts.find((p) => p.id === activeGeneratedPptId) ?? null);

  const dataSourceSelectValue = useMemo(() => {
    if (isGenerating) return "generating";
    if (dataSource === "mock") return "mock";
    if (activeGeneratedPptId) return `generated:${activeGeneratedPptId}`;
    return "mock";
  }, [activeGeneratedPptId, dataSource, isGenerating]);

  const activeSlides = useMemo(() => {
    return dataSource === "generated" && activeGeneratedPpt
      ? activeGeneratedPpt.slides
      : SLIDES_DATA;
  }, [dataSource, activeGeneratedPpt]);

  const onGenerate = async () => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ppt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: preset.topic,
          slideCount: preset.slideCount,
          tone: preset.tone,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const message = data?.error ?? "生成 PPT 失败，请稍后重试。";
        throw new Error(message);
      }

      const object = (await res.json()) as {
        slides?: FabricSlideJSON[];
      };

      if (object?.slides) {
        const presetConfig = PRESETS.find((p) => p.id === presetId);
        const slides = object.slides.map(normalizeFabricSlideJSON);
        addGeneratedPpt({
          slides,
          presetId: presetConfig?.id ?? "custom",
          title: presetConfig?.label ?? "未命名 PPT",
        });
        setDataSource("generated");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("生成 PPT 失败，请稍后重试。"),
      );
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
            {error ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertTitle>生成失败</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex w-full flex-col gap-2">
              {isGenerating ? (
                <div className="text-sm text-blue-600 animate-pulse">
                  正在流式生成中，已获取 {activeSlides.length} 页...
                </div>
              ) : dataSource === "generated" && activeGeneratedPpt ? (
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
              提示：数据由 AI 生成，仅供参考。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
