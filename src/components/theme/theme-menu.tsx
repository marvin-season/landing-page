"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "./theme-switcher";

export function ThemeMenu() {
  return (
    <div className="fixed top-3 right-3 z-50 sm:top-4 sm:right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Theme">
            <Palette className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-3">
          <ThemeSwitcher hideLabel />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
