import { useMemo } from "react";
import { Tag } from "@/components/ui/tag";

interface StackItem {
  name: string;
  url: string;
}

// 技术栈配置
const stacksConfig: StackItem[] = [
  { name: "React", url: "https://react.dev" },
  { name: "Next.js", url: "https://nextjs.org" },
  { name: "TypeScript", url: "https://www.typescriptlang.org" },
  { name: "Tailwind CSS", url: "https://tailwindcss.com" },
  { name: "Shadcn UI", url: "https://ui.shadcn.com" },
];

export default function Stack() {
  const stacks = useMemo(() => stacksConfig, []);
  return (
    <div className="flex flex-wrap gap-2">
      {stacks.map((stack) => (
        <a
          key={stack.name}
          href={stack.url}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer transition-opacity hover:opacity-80"
        >
          <Tag size={"compact"}>{stack.name}</Tag>
        </a>
      ))}
    </div>
  );
}
