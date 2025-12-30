"use client";

export default function ChatErrorPage({ error }: { error: Error }) {
  console.error("Chat error:", error);

  return (
    <div className="flex h-full w-full items-center justify-center ">
      <div className="bg-white border border-red-200 text-red-800 rounded-lg shadow p-6 max-w-md w-full flex flex-col items-center">
        <div className="font-semibold text-lg mb-2">出错了</div>
        <div className="text-sm text-red-700 text-center">{error.message}</div>
      </div>
    </div>
  );
}
