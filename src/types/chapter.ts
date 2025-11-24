export type Phase = "cover" | "content";

export type Chapter = {
  link?: string;
  id: string;
  title: string;
  tagline: string;
  summary: string;
  excerpt: string;
  keywords: string[];
  content: {
    hero: string;
    description: string;
    bullets: Array<{ title: string; body: string }>;
    metrics: Array<{ label: string; value: string; caption: string }>;
  };
};
