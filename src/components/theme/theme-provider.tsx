"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      themes={["light", "dark", "neutral", "shinchan"]}
      attribute="class"
      enableSystem
      defaultTheme="shinchan"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
