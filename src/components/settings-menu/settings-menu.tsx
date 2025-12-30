"use client";

import { SettingsIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SettingsMenuProps } from "./type";

export const SettingsMenu = ({ currentLang }: SettingsMenuProps) => {
  return (
    <div className="fixed z-100 top-3 right-3 sm:top-4 sm:right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-background/60 backdrop-blur-md border-border/60 shadow-md hover:bg-background/80"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-48 sm:min-w-56 px-4 py-3">
          <ThemeSwitcher />
          <DropdownMenuSeparator />
          <LanguageSwitcher currentLang={currentLang} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
