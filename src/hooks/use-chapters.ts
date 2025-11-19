"use client";

import { useLingui } from "@lingui/react/macro";
import { getChapters } from "@/lib/chapters";
import type { Chapter } from "@/types/chapter";

export function useChapters(): Chapter[] {
  const { i18n } = useLingui();
  return getChapters(i18n);
}
