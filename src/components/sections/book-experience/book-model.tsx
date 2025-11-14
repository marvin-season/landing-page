"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { bookSpringTransition, bookVariants } from "./motion-presets";
import type { Phase } from "./types";

type BookModelProps = {
  phase: Phase;
  interactive?: boolean;
  onClick?: () => void;
  label?: string;
};

const BookModel: React.FC<BookModelProps> = ({
  phase,
  interactive = false,
  onClick,
  label,
}) => {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className={cn(
        "group relative h-[320px] w-[240px] rounded-[32px] sm:h-[360px] sm:w-[280px]",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
      style={{
        transformStyle: "preserve-3d",
        pointerEvents: interactive ? "auto" : "none",
      }}
      variants={bookVariants}
      animate={phase}
      initial={false}
      transition={bookSpringTransition}
      whileHover={interactive ? { translateY: -6 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
    >
      <div
        className="absolute inset-0 rounded-[32px]"
        style={{
          background:
            "linear-gradient(120deg, rgba(15,23,42,0.95), rgba(30,41,59,0.8), rgba(15,23,42,0.95))",
          boxShadow:
            "0 40px 80px -40px rgba(15, 23, 42, 0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
          backfaceVisibility: "hidden",
          transform: "translateZ(24px)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
        }}
      >
        <div className="flex h-full flex-col justify-between p-8 text-left text-white">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
            <span>AI STUDIO</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>2025</span>
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">未开启的章节</p>
            <p className="mt-2 text-xs text-white/60">
              点击封面，唤醒一段全新的创作旅程
            </p>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 rounded-[32px]"
        style={{
          background:
            "linear-gradient(140deg, rgba(248,250,252,0.96), rgba(226,232,240,0.92))",
          transform: "rotateY(180deg) translateZ(24px)",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          boxShadow:
            "0 30px 60px -40px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255,255,255,0.7)",
          backfaceVisibility: "hidden",
        }}
      >
        <div className="flex h-full flex-col justify-between p-8 text-left text-slate-700">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            目录
          </span>
          <div className="space-y-3 text-sm text-slate-500">
            <p>• 创作工作流</p>
            <p>• AI 共创工作室</p>
            <p>• 洞察驱动表达</p>
            <p>• 内容管治中心</p>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-y-0 right-0 w-10 rounded-[32px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(236, 242, 255, 0.85), rgba(203, 213, 225, 0.8))",
          transform: "translateZ(12px)",
          filter: "brightness(1.05)",
          backfaceVisibility: "hidden",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-500 group-hover:opacity-20"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 60%)",
          transform: "translateZ(26px)",
          backfaceVisibility: "hidden",
        }}
      />
    </motion.button>
  );
};

export default BookModel;
