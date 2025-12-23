"use client";

import { Canvas } from "fabric";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { FabricSlideJSON } from "../fabric-slide-schema";
import {
  fabricSlideSchema,
  normalizeFabricSlideJSON,
} from "../fabric-slide-schema";

type Props = {
  slides: FabricSlideJSON[];
  slidesKey: string;
};

export function PptCanvasPlayer({ slides, slidesKey }: Props) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // init fabric
  useEffect(() => {
    if (!canvasEl.current) return;
    fabricCanvas.current = new Canvas(canvasEl.current, {
      width: 600,
      height: 360,
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

      <div className="flex items-center gap-4">
        <Button
          variant="soft"
          size="sm"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          上一页
        </Button>

        <span className="font-mono font-bold">
          {safeSlides.length === 0 ? 0 : currentIndex + 1} / {safeSlides.length}
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
    </div>
  );
}
