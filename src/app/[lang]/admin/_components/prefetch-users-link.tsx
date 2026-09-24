"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "@/components/link/link";
import { useTRPC } from "@/lib/trpc";

type PrefetchUsersLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function PrefetchUsersLink({
  href,
  className,
  children,
}: PrefetchUsersLinkProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  function prefetchUsers() {
    void queryClient
      .query(trpc.user.list.queryOptions())
      .catch(() => undefined);
  }

  return (
    <Link
      href={href}
      className={className}
      prefetch
      onMouseEnter={prefetchUsers}
      onFocus={prefetchUsers}
    >
      {children}
    </Link>
  );
}
