import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";

type HomePreview = {
  title: ReactNode;
  summary: ReactNode;
  details: { title: ReactNode; description: ReactNode }[];
};

export const homePreviews: Record<string, HomePreview> = {
  agent: {
    title: <Trans>AI conversations, with room to think.</Trans>,
    summary: (
      <Trans>
        Explore a conversational workspace built with Mastra. Start a chat,
        revisit a thread, and follow responses as they arrive in an interface
        designed for ongoing work.
      </Trans>
    ),
    details: [
      {
        title: <Trans>A workspace for ongoing conversations</Trans>,
        description: (
          <Trans>
            Keep separate topics in separate threads and return to previous
            discussions. The Agent UI brings conversation history and the
            current chat into one place.
          </Trans>
        ),
      },
      {
        title: <Trans>Follow answers as they unfold</Trans>,
        description: (
          <Trans>
            Streaming responses let you read while an answer is being generated.
            Sign in to enter the agent workspace and explore its chat modes.
          </Trans>
        ),
      },
    ],
  },
  resume: {
    title: <Trans>The developer behind the details.</Trans>,
    summary: (
      <Trans>
        Meet Marvin, a web developer focused on functional, thoughtful
        interfaces. Explore the experience and engineering work behind projects
        built with React, Next.js, and TypeScript.
      </Trans>
    ),
    details: [
      {
        title: <Trans>From interface to implementation</Trans>,
        description: (
          <Trans>
            Discover a frontend toolkit spanning React, Next.js, TypeScript,
            Tailwind CSS, and shadcn/ui, with attention to usability and web
            performance.
          </Trans>
        ),
      },
      {
        title: <Trans>Experience with context</Trans>,
        description: (
          <Trans>
            Read about professional roles, project work, and technical
            responsibilities in the full profile. The resume page requires
            access authorization.
          </Trans>
        ),
      },
    ],
  },
  admin_ppt: {
    title: <Trans>Turn a topic into a presentation.</Trans>,
    summary: (
      <Trans>
        Explore a web presentation tool that pairs structured slide generation
        with a canvas preview. Choose a topic preset, generate slide content,
        and review the result in your browser.
      </Trans>
    ),
    details: [
      {
        title: <Trans>Start with a structured brief</Trans>,
        description: (
          <Trans>
            Topic presets define the subject, tone, and slide count. Generate a
            presentation from a preset or explore the included sample slides.
          </Trans>
        ),
      },
      {
        title: <Trans>Review slides in one place</Trans>,
        description: (
          <Trans>
            Move through the canvas presentation and switch between sample
            content and generated decks. Inspect the slide sequence before
            taking your ideas further.
          </Trans>
        ),
      },
    ],
  },
  registry_template: {
    title: <Trans>Good interfaces start with shared foundations.</Trans>,
    summary: (
      <Trans>
        Explore a separate collection of UI components and design references.
        Find inspiration for consistent interfaces and reusable building blocks
        for frontend projects.
      </Trans>
    ),
    details: [
      {
        title: <Trans>Think in reusable components</Trans>,
        description: (
          <Trans>
            Use the component library as a reference when considering common UI
            patterns, visual consistency, and the building blocks of a design
            system.
          </Trans>
        ),
      },
      {
        title: <Trans>Explore the full collection</Trans>,
        description: (
          <Trans>
            Open the external design system site in a new tab to browse its
            components and references alongside your current project.
          </Trans>
        ),
      },
    ],
  },
  knowledge: {
    title: <Trans>Your documents. A clearer perspective.</Trans>,
    summary: (
      <Trans>
        Read PDF and Markdown documents in a dedicated workspace without
        creating an account. Keep useful passages close, preserve their source,
        and return to the original context.
      </Trans>
    ),
    details: [
      {
        title: <Trans>Read, select, and collect</Trans>,
        description: (
          <Trans>
            Open your own file or try the sample. Browse PDF pages, adjust the
            zoom, read formatted Markdown, and collect selected passages with
            document names and page references.
          </Trans>
        ),
      },
      {
        title: <Trans>Return to the source</Trans>,
        description: (
          <Trans>
            Click a PDF quote to return to its page and highlight the passage.
            Documents and notes stay in the current page session; AI replies and
            scanned-document OCR are not available yet.
          </Trans>
        ),
      },
    ],
  },
};
