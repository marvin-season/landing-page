"use client";

import { useLingui } from "@lingui/react/macro";
import { getChapters } from "@/components/sections/book-experience/chapters";
import type { Chapter } from "@/components/sections/book-experience/types";

export function useChapters(): Chapter[] {
  const { i18n } = useLingui();
  return getChapters(i18n);
}
