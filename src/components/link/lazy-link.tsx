"use client"; // 必须标记为客户端组件

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function LazyLink({ href, children, className }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      className={`cursor-pointer ${className}`} // 保持手型光标
      role="link"
    >
      {children}
    </div>
  );
}
