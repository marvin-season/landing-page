"use client";

import { Canvas } from "fabric";
import { useEffect, useRef, useState } from "react";

const SLIDES_DATA = [
  // 第一页：封面与重要性背景
  {
    version: "6.9.1",
    objects: [
      // 背景装饰色块
      {
        type: "Rect",
        left: 0,
        top: 0,
        width: 600,
        height: 60,
        fill: "#065f46", // 深绿色顶部栏
        selectable: false,
      },
      // 主标题
      {
        type: "IText",
        text: "低碳环保：守护我们的共同家园",
        left: 40,
        top: 15,
        fontSize: 28,
        fill: "#ffffff",
        fontWeight: "bold",
        fontFamily: "sans-serif",
      },
      // 核心观点标题
      {
        type: "IText",
        text: "为什么低碳环保迫在眉睫？",
        left: 40,
        top: 80,
        fontSize: 24,
        fill: "#047857",
        fontWeight: "bold",
      },
      // 正文内容 - 点位 1
      {
        type: "IText",
        text: "• 应对全球气候变暖：",
        left: 40,
        top: 130,
        fontSize: 20,
        fill: "#1f2937",
        fontWeight: "bold",
      },
      {
        type: "IText",
        text: "减少温室气体排放是抑制全球升温至 1.5°C 以内的关键，\n能有效减缓冰川融化与海平面上升。",
        left: 60,
        top: 160,
        fontSize: 16,
        fill: "#4b5563",
        lineHeight: 1.4,
      },
      // 正文内容 - 点位 2
      {
        type: "IText",
        text: "• 保护生物多样性：",
        left: 40,
        top: 220,
        fontSize: 20,
        fill: "#1f2937",
        fontWeight: "bold",
      },
      {
        type: "IText",
        text: "环境污染和气候剧变导致物种灭绝加速。低碳生活有助于\n恢复生态平衡，保护动植物栖息地。",
        left: 60,
        top: 250,
        fontSize: 16,
        fill: "#4b5563",
        lineHeight: 1.4,
      },
      // 底部修饰线条
      {
        type: "Rect",
        left: 40,
        top: 320,
        width: 520,
        height: 2,
        fill: "#10b981",
      },
    ],
  },
  // 第二页：核心策略与个人行动
  {
    version: "6.9.1",
    objects: [
      // 背景装饰色块
      {
        type: "Rect",
        left: 0,
        top: 0,
        width: 600,
        height: 60,
        fill: "#059669",
        selectable: false,
      },
      // 标题
      {
        type: "IText",
        text: "践行低碳生活：从意识到行动",
        left: 40,
        top: 15,
        fontSize: 28,
        fill: "#ffffff",
        fontWeight: "bold",
      },
      // 左侧内容栏：核心策略
      {
        type: "Rect",
        left: 40,
        top: 90,
        width: 250,
        height: 230,
        fill: "#f0fdf4",
        rx: 10,
        ry: 10, // 圆角矩形背景
      },
      {
        type: "IText",
        text: "【 核心策略 】",
        left: 60,
        top: 110,
        fontSize: 18,
        fill: "#065f46",
        fontWeight: "bold",
      },
      {
        type: "IText",
        text: "1. 能源转型：使用绿电\n2. 绿色出行：单车与公交\n3. 循环经济：减少浪费\n4. 植树造林：增加碳汇",
        left: 60,
        top: 150,
        fontSize: 16,
        fill: "#374151",
        lineHeight: 1.8,
      },
      // 右侧内容栏：行动倡议
      {
        type: "IText",
        text: "【 个人行动清单 】",
        left: 330,
        top: 110,
        fontSize: 18,
        fill: "#065f46",
        fontWeight: "bold",
      },
      {
        type: "IText",
        text: "• 随手关灯，节约一度电\n• 少用一次性塑料制品\n• 推广无纸化办公\n• 参与垃圾分类投放",
        left: 330,
        top: 150,
        fontSize: 16,
        fill: "#374151",
        lineHeight: 1.8,
      },
      // 底部总结语
      {
        type: "IText",
        text: "“ 我们不只是继承了祖先的地球，更是借用了子孙的地球。”",
        left: 0,
        top: 330,
        width: 600,
        textAlign: "center",
        fontSize: 14,
        fill: "#6b7280",
        fontStyle: "italic",
      },
    ],
  },
];
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
