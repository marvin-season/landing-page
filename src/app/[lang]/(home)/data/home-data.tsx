import { Trans } from "@lingui/react/macro";

export const profile = {
  name: "Marvin",
  avatar: "/avatar.gif",
  avatarAlt: "Marvin",
  title: <Trans>Software Engineer</Trans>,
  subtitle: (
    <Trans>
      Building practical AI products with a strong focus on iteration speed and
      developer experience.
    </Trans>
  ),
};

export const navLinks = [
  {
    href: "/agent",
    title: <Trans>Agent UI</Trans>,
    description: <Trans>Main chat flow powered by Mastra</Trans>,
    badge: "Core",
  },
  {
    href: "/resume",
    title: <Trans>About me in detail</Trans>,
    description: <Trans>Experience, projects, and personal profile</Trans>,
    badge: "Profile",
  },
  {
    href: "/admin/ppt",
    title: <Trans>A Simple PPT Generator</Trans>,
    description: <Trans>Generate slide content in a structured workflow</Trans>,
    badge: "Tool",
  },
  {
    href: "https://marvin-season.github.io/registry-template/",
    title: <Trans>Design System & Component Libs</Trans>,
    description: <Trans>Reusable UI components and design references</Trans>,
    badge: "External",
  },
];

export const quotes = [
  <Trans key="1">Leveraging less data to generate greater insights.</Trans>,
  <Trans key="2">
    Design is not just what it looks like. Design is how it works.
  </Trans>,
];
