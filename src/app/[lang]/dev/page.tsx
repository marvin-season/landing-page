"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MockPdfPreview = dynamic(
  () =>
    import("./_components/mock-pdf-preview").then((mod) => mod.MockPdfPreview),
  { ssr: false },
);

export default function DevPage() {
  const [items, setItems] = useState<number[]>([]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="flex min-h-125 max-h-dvh w-full max-w-4xl overflow-hidden border">
        <div className="relative w-1/2 shrink-0 border-r">
          <div className="absolute inset-0 flex flex-col">
            <MockPdfPreview />
          </div>
        </div>
        <div className="flex min-h-0 w-1/2 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.map((item) => (
              <div key={item} className="border-b px-10 h-20">
                Item {item}
              </div>
            ))}
          </div>
          <div className="flex shrink-0 border-t bg-amber-100">
            <button
              type="button"
              className="flex-1 border-r p-2"
              onClick={() => setItems((prev) => [...prev, prev.length + 1])}
            >
              测试按钮
            </button>
            <button
              type="button"
              className="flex-1 p-2"
              onClick={() => setItems((prev) => prev.slice(0, -1))}
            >
              移除按钮
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
