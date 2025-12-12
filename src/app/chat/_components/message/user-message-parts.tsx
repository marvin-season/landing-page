import type { UIMessage } from "ai";
import Markdown from "@/components/ui/markdown";

export default function UserMessageParts(props: { m: UIMessage }) {
  const { m } = props;
  return m.parts.map((p, i) =>
    p.type === "text" ? <Markdown key={i}>{p.text}</Markdown> : null,
  );
}
