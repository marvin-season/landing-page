"use client";

import { Streamdown } from "streamdown";

export default function DocumentMarkdown({ content }: { content: string }) {
  return (
    <Streamdown
      mode="static"
      controls={false}
      className="prose prose-sm dark:prose-invert max-w-none break-words prose-headings:scroll-mt-6 prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto [&_img]:max-w-full"
    >
      {content}
    </Streamdown>
  );
}
