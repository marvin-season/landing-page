"use client";

import { Button } from "@landing-page/design-system";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function WorldSignOutButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => signOut({ callbackUrl: "/auth" })}
    >
      <LogOut data-icon="inline-start" />
      退出登录
    </Button>
  );
}
