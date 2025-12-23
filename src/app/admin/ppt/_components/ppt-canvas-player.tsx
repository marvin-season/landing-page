"use client";

import { Canvas, StaticCanvas } from "fabric";
import { ChevronDown, Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import type { FabricSlideJSON } from "../fabric-slide-schema";
import {
  fabricSlideSchema,
  normalizeFabricSlideJSON,
  PPT_CANVAS,
} from "../fabric-slide-schema";

type Props = {
  slides: FabricSlideJSON[];
  slidesKey: string;
};

export function PptCanvasPlayer({ slides, slidesKey }: Props) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const safeSlides = useMemo(() => {
    return slides
      .map((s) => {
        const parsed = fabricSlideSchema.safeParse(s);
        if (!parsed.success) return null;
        return normalizeFabricSlideJSON(parsed.data);
      })
      .filter((s): s is FabricSlideJSON => s != null);
  }, [slides]);

  const loadSlide = useCallback(
    async (index: number) => {
      if (!fabricCanvas.current) return;
      const slide = safeSlides[index];
      if (!slide) return;

      fabricCanvas.current.clear();
      fabricCanvas.current.backgroundColor = "#ffffff";
      await fabricCanvas.current.loadFromJSON(slide);
      fabricCanvas.current.requestRenderAll();
    },
    [safeSlides],
  );

  const exportAsImage = useCallback(async () => {
    if (!fabricCanvas.current) return;
    const dataUrl = fabricCanvas.current.toDataURL({
      format: "png",
      multiplier: 2, // 高清导出
    });
    const link = document.createElement("a");
    link.download = `ppt-slide-${currentIndex + 1}.png`;
    link.href = dataUrl;
    link.click();
  }, [currentIndex]);

  const exportAllAsImages = useCallback(async () => {
    setIsExporting(true);
    try {
      const tempCanvasEl = document.createElement("canvas");
      const staticCanvas = new StaticCanvas(tempCanvasEl, {
        width: PPT_CANVAS.width,
        height: PPT_CANVAS.height,
      });

      for (let i = 0; i < safeSlides.length; i++) {
        staticCanvas.clear();
        staticCanvas.backgroundColor = "#ffffff";
        await staticCanvas.loadFromJSON(safeSlides[i]);
        staticCanvas.renderAll();

        const dataUrl = staticCanvas.toDataURL({
          format: "png",
          multiplier: 2,
        });
        const link = document.createElement("a");
        link.download = `ppt-slide-${i + 1}.png`;
        link.href = dataUrl;
        link.click();
        // 稍微停顿一下防止浏览器拦截连续下载
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      staticCanvas.dispose();
    } finally {
      setIsExporting(false);
    }
  }, [safeSlides]);

  // init fabric
  useEffect(() => {
    if (!canvasEl.current) return;
    fabricCanvas.current = new Canvas(canvasEl.current, {
      width: PPT_CANVAS.width,
      height: PPT_CANVAS.height,
      backgroundColor: "#ffffff",
    });

    return () => {
      fabricCanvas.current?.dispose();
    };
  }, []);

  // when slides set changes, reset to first page
  useEffect(() => {
    if (!slidesKey) return;
    setCurrentIndex(0);
  }, [slidesKey]);

  // render current page
  useEffect(() => {
    void loadSlide(currentIndex);
  }, [currentIndex, loadSlide]);

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0) return;
    if (nextIndex >= safeSlides.length) return;
    setCurrentIndex(nextIndex);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="shadow-2xl border-8 border-gray-800 rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasEl} />
      </div>

      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="soft"
            size="sm"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            上一页
          </Button>

          <span className="font-mono font-bold text-slate-700">
            {safeSlides.length === 0 ? 0 : currentIndex + 1} /{" "}
            {safeSlides.length}
          </span>

          <Button
            variant="soft"
            size="sm"
            onClick={() => goTo(currentIndex + 1)}
            disabled={
              safeSlides.length === 0 || currentIndex === safeSlides.length - 1
            }
          >
            下一页
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                一键导出
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAsImage}>
                导出当前页 (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportAllAsImages}
                disabled={safeSlides.length === 0}
              >
                导出所有页 (PNG序列)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify({ slides: safeSlides })],
                    {
                      type: "application/json",
                    },
                  );
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "ppt-data.json";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                导出 PPT 数据 (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
