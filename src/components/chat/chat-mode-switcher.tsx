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
    label: "agent",
    href: "/agent",
  },
  {
    label: "home",
    href: "/",
  },
];

export function ChatModeSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentNav = navs.find((nav) => pathname.startsWith(nav.href));
  if (!currentNav) return null;
  return (
    <div className="">
      <Select
        defaultValue={currentNav?.href}
        onValueChange={(value) => {
          router.push(value);
        }}
      >
        <SelectTrigger className="w-[190px] border-border/80 bg-background/90 shadow-sm backdrop-blur">
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
