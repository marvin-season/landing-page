"use client";

export default function FundPage() {
  return (
    <div
      className="text-center py-8 text-muted-foreground"
      onClick={() => {
        const res = fetch("/api-sina/list=sh600519", {});
        res.then(async (res) => {
          const body = res.body;
          const reader = body?.getReader();
          if (!reader) return;
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            console.log(text);
          }
          // console.log(result)
        });
      }}
    >
      Fund Page
    </div>
  );
}
