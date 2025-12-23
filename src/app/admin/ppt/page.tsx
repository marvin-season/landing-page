"use client";

import { Canvas } from "fabric";
import { useEffect, useRef, useState } from "react";
import { SLIDES_DATA } from "./data";

export default function SimplePPTPlayer() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 初始化 Canvas
  // biome-ignore lint/correctness/useExhaustiveDependencies: <1>
  useEffect(() => {
    if (!canvasEl.current) return;

    fabricCanvas.current = new Canvas(canvasEl.current, {
      width: 600,
      height: 360,
      backgroundColor: "#ffffff",
    });

    // 初始加载第一页
    loadSlide(0);

    return () => {
      fabricCanvas.current?.dispose();
    };
  }, []);

  // 加载特定页码的函数
  const loadSlide = async (index: number) => {
    if (!fabricCanvas.current) return;

    // 清空当前画布
    fabricCanvas.current.clear();
    fabricCanvas.current.backgroundColor = "#ffffff";

    // 加载 JSON 数据
    // 注意：Fabric v6 的 loadFromJSON 是异步的
    await fabricCanvas.current.loadFromJSON(SLIDES_DATA[index]);

    fabricCanvas.current.requestRenderAll();
  };

  // 切换页面处理
  const goToSlide = (index: number) => {
    if (index >= 0 && index < SLIDES_DATA.length) {
      setCurrentIndex(index);
      loadSlide(index);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-gray-100 min-h-screen">
      <h1 className="text-xl font-bold">简易 Web PPT 渲染器</h1>

      {/* PPT 画布区域 */}
      <div className="shadow-2xl border-8 border-gray-800 rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasEl} />
      </div>

      {/* 控制条 */}
      <div className="flex items-center gap-6 mt-4 bg-white px-6 py-3 rounded-full shadow-md">
        <button
          className="px-4 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 rounded"
          onClick={() => goToSlide(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          上一页
        </button>

        <span className="font-mono font-bold">
          {currentIndex + 1} / {SLIDES_DATA.length}
        </span>

        <button
          className="px-4 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 rounded"
          onClick={() => goToSlide(currentIndex + 1)}
          disabled={currentIndex === SLIDES_DATA.length - 1}
        >
          下一页
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-2">
        提示：页面由 Fabric.js JSON 数据驱动渲染
      </p>
    </div>
  );
}
