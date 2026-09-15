import { Trans } from "@lingui/react/macro";
import {
  BookOpen,
  Bot,
  FileUser,
  History,
  type LucideIcon,
  Presentation,
  Shapes,
} from "lucide-react";
import type { ReactNode } from "react";

export const profile = {
  name: <Trans>Crayon Shin-chan</Trans>,
  // Character artwork: https://manga-shinchan.com/character/shinchan
  avatar: "/shinchan.png",
  avatarAlt: "Crayon Shin-chan",
  eyebrow: <Trans>A little mischief, a lot of joy</Trans>,
  title: <Trans>Shinnosuke Nohara</Trans>,
  subtitle: (
    <Trans>
      A mischievous five-year-old who turns everyday life into an adventure.
    </Trans>
  ),
  summary: (
    <Trans>
      With his family and friends, Shin-chan fills ordinary days with playful
      antics, unexpected surprises, and plenty of laughter.
    </Trans>
  ),
};

export type HomeNavLink = {
  href: string;
  analyticsId: string;
  title: ReactNode;
  description: ReactNode;
  badge: string;
  icon: LucideIcon;
};

export const navLinks: HomeNavLink[] = [
  {
    href: "/agent",
    analyticsId: "agent",
    title: <Trans>Agent UI</Trans>,
    description: <Trans>Main chat flow powered by Mastra</Trans>,
    badge: "Core",
    icon: Bot,
  },
  {
    href: "/resume",
    analyticsId: "resume",
    title: <Trans>About me in detail</Trans>,
    description: <Trans>Experience, projects, and personal profile</Trans>,
    badge: "Profile",
    icon: FileUser,
  },
  {
    href: "/admin/ppt",
    analyticsId: "admin_ppt",
    title: <Trans>A Simple PPT Generator</Trans>,
    description: <Trans>Generate slide content in a structured workflow</Trans>,
    badge: "Tool",
    icon: Presentation,
  },
  {
    href: "https://marvin-season.github.io/registry-template/",
    analyticsId: "registry_template",
    title: <Trans>Design System & Component Libs</Trans>,
    description: <Trans>Reusable UI components and design references</Trans>,
    badge: "External",
    icon: Shapes,
  },
  {
    href: "/knowledge",
    analyticsId: "knowledge",
    title: <Trans>Docs</Trans>,
    description: (
      <Trans>
        Documentation on frontend development, AI applications, and engineering
        practices
      </Trans>
    ),
    badge: "Knowledge",
    icon: BookOpen,
  },
  {
    href: "/changelog",
    analyticsId: "changelog",
    title: <Trans>Product updates</Trans>,
    description: <Trans>Three iterations of the Docs workspace</Trans>,
    badge: "Changelog",
    icon: History,
  },
];

export const quotes = [
  <Trans key="1">Leveraging less data to generate greater insights.</Trans>,
  <Trans key="2">
    Design is not just what it looks like. Design is how it works.
  </Trans>,
];
