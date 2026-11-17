import type { ReactNode } from "react";

export function WorldCard({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <article
      className="group border-b last:border-b-0 flex items-start gap-4 py-3 cursor-pointer"
      onClick={onClick}
    >
      {children}
    </article>
  );
}
