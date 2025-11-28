"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

// 预定义的颜色调色板 - 简约淡雅的配色方案（十六进制格式）
const colorPalette = [
  { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" }, // 淡绿色
  { bg: "#e0f2f1", text: "#00695c", border: "#80cbc4" }, // 淡青色
  { bg: "#e3f2fd", text: "#1565c0", border: "#90caf9" }, // 淡蓝色
  { bg: "#ede7f6", text: "#6a1b9a", border: "#b39ddb" }, // 淡紫色
  { bg: "#fff3e0", text: "#e65100", border: "#ffb74d" }, // 淡橙色
  { bg: "#ffebee", text: "#c62828", border: "#ef5350" }, // 淡红色
  { bg: "#f3e5f5", text: "#7b1fa2", border: "#ba68c8" }, // 淡紫红色
  { bg: "#e0f7fa", text: "#00838f", border: "#4dd0e1" }, // 淡蓝绿色
  { bg: "#fffde7", text: "#f57f17", border: "#fff176" }, // 淡黄色
  { bg: "#e8f5e9", text: "#388e3c", border: "#81c784" }, // 淡青绿色
  { bg: "#f1f8e9", text: "#558b2f", border: "#aed581" }, // 淡黄绿色
  { bg: "#e1f5fe", text: "#0277bd", border: "#4fc3f7" }, // 淡天蓝色
  { bg: "#fce4ec", text: "#c2185b", border: "#f48fb1" }, // 淡粉红色
  { bg: "#fff8e1", text: "#ff8f00", border: "#ffcc80" }, // 淡琥珀色
  { bg: "#e8eaf6", text: "#3949ab", border: "#9fa8da" }, // 淡靛蓝色
  { bg: "#f9fbe7", text: "#827717", border: "#d4e157" }, // 淡酸橙绿
  { bg: "#e0f2f1", text: "#00796b", border: "#4db6ac" }, // 淡青蓝色
  { bg: "#f3e5f5", text: "#8e24aa", border: "#ce93d8" }, // 淡深紫色
  { bg: "#e8f5e9", text: "#1b5e20", border: "#66bb6a" }, // 淡深绿色
  { bg: "#e3f2fd", text: "#0d47a1", border: "#64b5f6" }, // 淡深蓝色
  { bg: "#fff3e0", text: "#bf360c", border: "#ff8a65" }, // 淡深橙色
  { bg: "#ffebee", text: "#b71c1c", border: "#e57373" }, // 淡深红色
  { bg: "#f1f8e9", text: "#33691e", border: "#9ccc65" }, // 淡橄榄绿
  { bg: "#e0f7fa", text: "#004d40", border: "#26a69a" }, // 淡深青色
  { bg: "#ede7f6", text: "#4a148c", border: "#9575cd" }, // 淡深紫
];

// 根据文本内容生成稳定的颜色索引
function getColorIndex(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPalette.length;
}

const tagVariants = cva(
  "inline-flex items-center rounded-md border font-medium transition-colors backdrop-blur",
  {
    variants: {
      size: {
        compact: "px-2 py-0.5 text-xs",
        normal: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      size: "normal",
    },
  },
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  children: React.ReactNode;
}

export function Tag({ children, size, className, ...props }: TagProps) {
  const text = typeof children === "string" ? children : String(children);
  const colorIndex = useMemo(() => getColorIndex(text.trim()), [text]);
  const colors = colorPalette[colorIndex];

  return (
    <span
      className={cn(tagVariants({ size }), "bg-transparent", className)}
      style={{
        color: colors.text,
        borderColor: colors.border,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

export default Tag;
