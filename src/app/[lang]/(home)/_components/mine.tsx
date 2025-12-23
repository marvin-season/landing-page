"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { generator } from "@/app/[lang]/(home)/_components/data";
import { MotionSpan } from "@/components/ui";

export function Mine() {
  const [stream, setStream] = useState<ReactNode[]>([]);

  const handle = useCallback(async () => {
    for (const chunk of generator) {
      console.log(chunk);
      setStream((prev) => [...prev, chunk]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }, []);

  useEffect(() => {
    handle();
    return () => {
      setStream([]);
    };
  }, [handle]);

  return (
    <div>
      {stream.map((chunk, index) => (
        <MotionSpan
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          key={index}
        >
          {chunk}
        </MotionSpan>
      ))}
    </div>
  );
}
