import type { Metadata } from "next";

export const SITE_NAME = "Crayon Shin-chan";

export function brandedTitle(defaultTitle: string): Metadata["title"] {
  return {
    default: defaultTitle,
    template: `%s · ${SITE_NAME}`,
  };
}
