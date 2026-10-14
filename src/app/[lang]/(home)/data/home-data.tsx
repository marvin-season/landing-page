import { Trans } from "@lingui/react/macro";
import {
  BookOpen,
  Bot,
  FileUser,
  History,
  type LucideIcon,
  Shapes,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

const shinchanProfile = {
  name: <Trans>Crayon Shin-chan</Trans>,
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

export type HomeProfile = {
  name: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  summary: ReactNode;
  avatar?: { src: string; alt: string; rounded: boolean };
  action: {
    href: string;
    label: ReactNode;
    analyticsId: string;
    external: boolean;
  };
};

export const homeProfiles = {
  default: {
    name: <Trans>Explore AI</Trans>,
    eyebrow: <Trans>Ideas start with curiosity</Trans>,
    title: <Trans>Your AI workspace</Trans>,
    subtitle: <Trans>Ask, learn, and create with AI.</Trans>,
    summary: (
      <Trans>
        Explore knowledge, work through questions, and turn ideas into something
        useful with AI conversations and creative tools.
      </Trans>
    ),
    action: {
      href: "/agent",
      label: <Trans>Chat with AI</Trans>,
      analyticsId: "agent",
      external: false,
    },
  },
  shinchan: {
    ...shinchanProfile,
    avatar: { src: "/shinchan.png", alt: "Crayon Shin-chan", rounded: true },
    action: {
      href: "https://www.tv-asahi.co.jp/shinchan/character/",
      label: <Trans>Meet Shin-chan</Trans>,
      analyticsId: "shinchan",
      external: true,
    },
  },
  loopy: {
    avatar: {
      src: "/bbq/companions/hello-still.png",
      alt: "Loopy",
      rounded: false,
    },
    name: "Loopy",
    eyebrow: <Trans>Take it easy, enjoy the little things</Trans>,
    title: <Trans>Gentle, curious, and a little playful</Trans>,
    subtitle: <Trans>Make room for small joys every day.</Trans>,
    summary: (
      <Trans>
        Welcome to Loopy's cozy corner. Slow down, explore something new, and
        keep the little moments that make you smile.
      </Trans>
    ),
    action: {
      href: "/bookkeeping",
      label: <Trans>Loopy 记账</Trans>,
      analyticsId: "bookkeeping",
      external: false,
    },
  },
} satisfies Record<string, HomeProfile>;

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
    href: "/knowledge",
    analyticsId: "knowledge",
    title: <Trans>Knowledge</Trans>,
    description: (
      <Trans>
        Documentation on frontend development, AI applications, and engineering
        practices
      </Trans>
    ),
    badge: "Core",
    icon: BookOpen,
  },
  {
    href: "/bookkeeping",
    analyticsId: "bookkeeping",
    title: <Trans>Loopy 记账</Trans>,
    description: (
      <>
        <Trans>个人记账</Trans> · <Trans>支出统计</Trans> ·{" "}
        <Trans>热量记录</Trans>
      </>
    ),
    badge: "NEW",
    icon: Wallet,
  },
  {
    href: "/agent",
    analyticsId: "agent",
    title: <Trans>Agent UI</Trans>,
    description: <Trans>Main chat flow powered by Mastra</Trans>,
    badge: "Chat",
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
    href: "https://marvin-season.github.io/registry-template/",
    analyticsId: "registry_template",
    title: <Trans>Design System & Component Libs</Trans>,
    description: <Trans>Reusable UI components and design references</Trans>,
    badge: "External",
    icon: Shapes,
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
