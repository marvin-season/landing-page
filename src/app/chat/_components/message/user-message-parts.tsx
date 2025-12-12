import type { UIMessage } from "ai";

export default function UserMessageParts(props: { m: UIMessage }) {
  const { m } = props;
  return m.parts.map((p, i) =>
    p.type === "text" ? (
      <span key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
        {p.text}
      </span>
    ) : null,
  );
}
