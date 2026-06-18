import { Trans } from "@lingui/react/macro";
import {
  Bot,
  FileUser,
  type LucideIcon,
  Presentation,
  Shapes,
} from "lucide-react";
import type { ReactNode } from "react";

export const profile = {
  name: "Marvin",
  avatar: "/avatar.gif",
  avatarAlt: "Marvin",
  eyebrow: <Trans>Independent builder</Trans>,
  title: <Trans>Software Engineer</Trans>,
  subtitle: (
    <Trans>
      Building practical AI products with a strong focus on iteration speed and
      developer experience.
    </Trans>
  ),
  summary: (
    <Trans>
      I turn rough product ideas into working AI interfaces, internal tools, and
      systems that are fast to try, easy to revise, and pleasant to use.
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
];

export const quotes = [
  <Trans key="1">Leveraging less data to generate greater insights.</Trans>,
  <Trans key="2">
    Design is not just what it looks like. Design is how it works.
  </Trans>,
];
