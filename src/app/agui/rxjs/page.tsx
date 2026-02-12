"use client";

export default function RxjsPage() {
  return (
    <div>
      <button
        onClick={() => {
          fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({
              resourceId: "29bdf526-2fd1-4dd1-b301-a3812f267931",
              id: "29bdf526-2fd1-4dd1-b301-a3812f267931",
              messages: [
                {
                  parts: [{ type: "text", text: "hi" }],
                  id: "yGMFp1VEgsBxxZH7",
                  role: "user",
                },
              ],
              trigger: "submit-message",
            }),
          });
        }}
      >
        Click me
      </button>
    </div>
  );
}
