"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UnifiedMarkdown } from "./index";

const c = `
Welcome to **MyAI Portal** 
`;

export default function Demo() {
  const [content, setContent] = useState<string>("");
  const interval = useRef<any>(null);

  const [hasNextChunk, setHasNextChunk] = useState(false);

  const handleStart = () => {
    let i = 0;
    setHasNextChunk(true);
    interval.current = setInterval(() => {
      const char = c.at(i);
      if (char) {
        setContent((prev) => prev + char);
      } else {
        setHasNextChunk(false);
        clearInterval(interval.current);
      }
      i += 1;
    }, 40);
  };

  const handleReset = () => {
    clearInterval(interval.current);
    setContent(c);
  };

  return (
    <div className="">
      <div className="flex gap-4">
        <Button onClick={handleStart}>Start</Button>
        <Button onClick={handleReset}>Reset</Button>
      </div>
      <UnifiedMarkdown
        className="flex-1"
        content={content}
        streaming={{ hasNextChunk: hasNextChunk }}
      />
    </div>
  );
}
