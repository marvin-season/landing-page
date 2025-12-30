// app/global-error.js
"use client";
import "@/css/globals.css";

export default function GlobalError({
  error,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex h-dvh w-full items-center justify-center ">
          <div className="bg-white border border-red-200 text-red-800 rounded-lg shadow p-6 max-w-md w-full flex flex-col items-center">
            <div className="font-semibold text-lg mb-2">出错了</div>
            <div className="text-sm text-red-700 text-center">
              {error.message}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
