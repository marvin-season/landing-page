import type { ReactNode } from "react";

export type AiMentionItem<T = unknown> = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  data?: T;
};

export type AiInputSubmitValue<T = unknown> = {
  text: string;
  mentions: AiMentionItem<T>[];
};

export type MentionRange = {
  start: number;
  end: number;
  query: string;
};
