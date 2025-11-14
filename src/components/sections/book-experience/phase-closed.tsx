"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import BookModel from "./book-model";
import { hoverTransition, sceneTransition } from "./motion-presets";
import type { Phase } from "./types";

type ClosedViewProps = {
  phase?: Phase;
  directoryHref: string;
};

const ClosedView: React.FC<ClosedViewProps> = ({
  phase = "closed",
  directoryHref,
}) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-10 text-center"
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -48 }}
      transition={sceneTransition}
    >
      <div className="relative flex justify-center">
        <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-white/20 blur-3xl" />
        <Link
          href={directoryHref}
          className="relative flex justify-center"
          style={{ perspective: "1900px" }}
        >
          <BookModel phase={phase} interactive />
        </Link>
      </div>
      <div className="flex max-w-lg flex-col items-center gap-4">
        <p className="text-base leading-relaxed text-slate-500">
          一本刚刚抵达你桌面的 AI
          创作手册。点击封面，进入目录，与团队一起探索全新的内容生产方式。
        </p>
        <Link
          href={directoryHref}
          className={cn(
            "group inline-flex items-center gap-3 rounded-full bg-slate-900 px-7 py-3 text-base text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-800",
          )}
        >
          立即翻阅
          <motion.span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20"
            whileHover={{ x: 4 }}
            transition={hoverTransition}
          >
            <ArrowRight className="h-4 w-4" />
          </motion.span>
        </Link>
      </div>
    </motion.div>
  );
};

export default ClosedView;
