"use client";

import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

type SettingsMenuProps = {
  currentLang?: string;
};

export const SettingsMenu = ({ currentLang }: SettingsMenuProps) => {
  return (
    <div className="fixed z-10 top-3 right-3 sm:top-4 sm:right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-background/60 backdrop-blur-md border-border/60 shadow-md hover:bg-background/80"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto sm:min-w-56 bg-background/95 backdrop-blur-md border-border/60 p-3"
        >
          <ThemeSwitcher className="w-full" />
          <DropdownMenuSeparator />
          <LanguageSwitcher currentLang={currentLang} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
