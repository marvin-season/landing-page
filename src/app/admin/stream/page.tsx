"use client";
import { motion } from "motion/react";
import { memo, useEffect, useState } from "react";

export default function StreamPage() {
  const [chunks, setChunks] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newChunk = Math.random().toString(36).substring(2, 5);
      setChunks((prev) => {
        const next = [
          ...prev,
          { id: Math.random().toString(36).substring(2, 9), text: newChunk },
        ];
        if (next.length > 200) {
          return next.slice(-100);
        }
        return next;
      });
    }, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`break-all w-[300px] mx-auto bg-gray-200 rounded p-2 font-mono leading-relaxed`}
    >
      {chunks.map((chunk) => (
        <MemoTxtChunk key={chunk.id} text={chunk.text} />
      ))}
    </div>
  );
}

function TxtChunk({ text }: { text: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="inline-block"
    >
      {text}
    </motion.span>
  );
}

const MemoTxtChunk = memo(TxtChunk);
