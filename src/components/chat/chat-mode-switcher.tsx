"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navs = [
  {
    label: "home",
    href: "/",
  },
  {
    label: "agent",
    href: "/agent",
  },
  {
    label: "copilot",
    href: "/agui",
  },
];

export function ChatModeSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentNav = navs.find((nav) => nav.href === pathname);

  if (!currentNav) return null;
  return (
    <div className="fixed right-4 top-4 z-50">
      <Select
        value={currentNav?.href}
        onValueChange={(value) => {
          router.push(value);
        }}
      >
        <SelectTrigger className="w-[190px] rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur">
          <SelectValue placeholder="选择模式" />
        </SelectTrigger>
        <SelectContent align="end">
          {navs.map((nav) => (
            <SelectItem key={nav.href} value={nav.href}>
              {nav.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
