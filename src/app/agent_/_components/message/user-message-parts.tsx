import type { UIMessage } from "ai";
import Markdown from "@/components/markdown";

export default function UserMessageParts(props: { m: UIMessage }) {
  const { m } = props;
  return (
    <div className="wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {m.parts.map((p, i) =>
        p.type === "text" ? <Markdown key={i}>{p.text}</Markdown> : null,
      )}
    </div>
  );
}
