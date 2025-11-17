import type { Chapter } from "./types";

export const chapters: Chapter[] = [
  {
    link: "https://ds.fuelstack.icu/",
    id: "engineering",
    title: "Engineering-First AI Studio",
    tagline: "AI orchestrates every step of content production.",
    summary:
      "Full-stack automation integrates design systems, documentation, UI components, and delivery for seamless engineering productivity.",
    excerpt:
      "A unified workspace built around engineering best practices. From Shadcn UI design system and automated Fumadocs documentation, to UI automation and robust docs integration—engineers can scale content delivery globally with optimal tooling.",
    keywords: [
      "Engineering",
      "Design System",
      "Component System",
      "UI Automation",
      "Docs Integration",
      "Shadcn UI",
      "Fumadocs",
      "Developer Experience",
      "Documentation Automation",
    ],
    content: {
      hero: "Achieve unmatched consistency and velocity with Shadcn UI components and Fumadocs-powered automated documentation—putting engineers in control of the AI content lifecycle.",
      description:
        "The AI Studio harnesses a state-of-the-art component system (Shadcn UI), deeply coupled with live, automated documentation (Fumadocs). Design, code, and docs are always in sync, enabling engineering teams to maintain quality, iterate rapidly, and scale confidently.",
      bullets: [
        {
          title: "Unified Design System",
          body: "Shadcn UI underpins the studio's visual language, offering accessible, reusable, and consistent components for fast, error-free development.",
        },
        {
          title: "Automated Live Documentation",
          body: "Fumadocs keeps component and API documentation always current—complete with live code previews—so every update is immediately reflected across platforms.",
        },
        {
          title: "Developer-Centric Workflow",
          body: "Hot-reload capabilities, flexible theming, and atomic design patterns help engineers deploy new features fast. Docs and UI always update in lockstep.",
        },
        {
          title: "Robust UI Automation",
          body: "UI automation and docs integration ensure updates flow instantly from the codebase to all internal and external endpoints for a true single source of truth.",
        },
        {
          title: "Built for Extensibility",
          body: "Easily add new Shadcn-based components—Fumadocs instantly documents them across all use cases, minimizing onboarding and maintenance overhead.",
        },
      ],
      metrics: [
        {
          label: "Design System Adoption",
          value: "100%",
          caption:
            "All UI uses Shadcn UI—customizable, accessible, and consistent components.",
        },
        {
          label: "Doc Coverage",
          value: "100%",
          caption:
            "Every feature, API, and UI element documented via Fumadocs.",
        },
        {
          label: "Time-to-Delivery",
          value: "2.5x",
          caption:
            "Faster release cycles vs. legacy stacks due to unified automation.",
        },
        {
          label: "Developer Onboarding",
          value: "-40%",
          caption:
            "Faster onboarding via documentation and component system synergy.",
        },
      ],
    },
  },
  {
    id: "workflow",
    title: "Intelligent Creative Workflows",
    tagline: "AI orchestrates every step of content production.",
    summary:
      "Automation keeps every stage from inspiration to delivery aligned.",
    excerpt:
      "Build a closed-loop workspace for ideation, proofreading, and distribution while keeping your brand voice consistent.",
    keywords: [
      "Multimodal Templates",
      "Audience Adaptation",
      "Team Collaboration",
    ],
    content: {
      hero: "Connect every node between inspiration and publication so collaboration stays traceable, reusable, and optimizable.",
      description:
        "String together idea capture, generation, review, and omnichannel distribution. A visual orchestrator and strategy engine give your team a tireless AI partner.",
      bullets: [
        {
          title: "Workflow Orchestration",
          body: "Drag-and-drop multimodal templates and auto-distribute to each channel, eliminating repetitive cross-platform work.",
        },
        {
          title: "Brand Voice Guardrails",
          body: "Reference your brand corpus in real time to keep tone and style consistent for every external touchpoint.",
        },
        {
          title: "Team Sync",
          body: "Role-based permissions with comments, annotations, and history let teams collaborate smoothly across key checkpoints.",
        },
        {
          title: "Intelligent Proofreading",
          body: "Generate multi-dimensional review suggestions automatically to keep every output professional, compliant, and on-brand.",
        },
      ],
      metrics: [
        {
          label: "Efficiency Boost",
          value: "3.2x",
          caption: "Average delivery cycle reduced",
        },
        {
          label: "Consistency",
          value: "97%",
          caption: "Brand voice alignment",
        },
        {
          label: "Feedback Convergence",
          value: "-48%",
          caption: "Fewer revision loops",
        },
      ],
    },
  },
  {
    id: "co-writing",
    title: "AI Co-Creation Studio",
    tagline: "Ideas first, finished assets fast.",
    summary:
      "Turn AI into a senior creative partner that links ideation, scripts, and execution.",
    excerpt:
      "Outline-driven workflows keep ideas flowing while decisions and context stay synchronized.",
    keywords: [
      "Multi-role Collaboration",
      "Context Memory",
      "Real-time Co-writing",
    ],
    content: {
      hero: "Ground every project in shared context and multi-role co-writing so ideas iterate within a unified narrative.",
      description:
        "Context caching and AI personas help the assistant understand your team's vocabulary. Whether you need outlines, scripts, or copy decks, iterate continuously in a single context.",
      bullets: [
        {
          title: "Context Memory",
          body: "Auto-store project background and glossaries so everyone, including every AI assistant, creates in sync.",
        },
        {
          title: "AI Personas",
          body: "Spin up strategist, copywriter, or designer personas that deliver task-specific perspectives instantly.",
        },
        {
          title: "Live Co-Writing",
          body: "As teammates edit together, AI suggests supporting paragraphs and assets based on the shared context.",
        },
        {
          title: "Inspiration Stack",
          body: "Archive inspiration, references, and feedback for quick recall whenever you're ready to keep writing.",
        },
      ],
      metrics: [
        {
          label: "Creative Turnaround",
          value: "1/2",
          caption: "Average planning time cut in half",
        },
        {
          label: "Collaboration Adoption",
          value: "84%",
          caption: "Daily active team usage",
        },
        {
          label: "Idea Hit Rate",
          value: "+62%",
          caption: "First-round proposal approvals",
        },
      ],
    },
  },
  {
    id: "insight",
    title: "Insight-Driven Growth Content",
    tagline: "Calibrate every message with data.",
    summary:
      "Blend marketing data, customer feedback, and sentiment into actionable insights.",
    excerpt:
      "Let insights and content feed each other so every expression becomes sharper.",
    keywords: ["Behavior Insights", "Sentiment Loop", "A/B Validation"],
    content: {
      hero: "Real-time insight pipelines guide creative direction, recommend expressions, and feed back performance automatically.",
      description:
        "Pull behavior data, channel feedback, and competitor sentiment into targeted recommendations. Once content ships, performance metrics refine strategy, creating a self-improving growth loop.",
      bullets: [
        {
          title: "Insight Dashboard",
          body: "Aggregate multi-channel data and cluster intent semantically so emerging opportunities are obvious.",
        },
        {
          title: "Expression Suggestions",
          body: "Receive tone, structure, and asset tips tailored to each audience, reducing guesswork.",
        },
        {
          title: "Performance Feedback",
          body: "Capture campaign performance automatically and quantify the impact of each message on conversion.",
        },
        {
          title: "Learning Loop",
          body: "Continuously train a private brand model so future content reuses proven narratives.",
        },
      ],
      metrics: [
        {
          label: "Return on Spend",
          value: "+41%",
          caption: "Average conversion lift",
        },
        {
          label: "Insight Speed",
          value: "-68%",
          caption: "Time from data to action",
        },
        {
          label: "Iteration Pace",
          value: "24h",
          caption: "Hot topic response cycle",
        },
      ],
    },
  },
  {
    id: "governance",
    title: "Content Governance & Asset Hub",
    tagline: "Keep content assets safe and accountable.",
    summary:
      "Build a secure, traceable, and controllable content asset center covering end-to-end governance.",
    excerpt:
      "Protect compliance while making every asset measurable, reusable, and ready to scale.",
    keywords: ["Asset Archiving", "Permission Model", "Quality Scoring"],
    content: {
      hero: "Generate content efficiently and turn it into reusable assets while staying safe, controlled, and transparent.",
      description:
        "Govern creation, approval, publishing, and archiving with granular permissions and quality scoring so every output remains within guardrails.",
      bullets: [
        {
          title: "Granular Permissions",
          body: "Apply segment-level access and safely extend collaboration to external partners when needed.",
        },
        {
          title: "Compliance Monitoring",
          body: "Use built-in sensitive term libraries, rights checks, and generation history to reduce exposure.",
        },
        {
          title: "Structured Assets",
          body: "Automatically structure content into modular assets for effortless reuse across projects.",
        },
        {
          title: "Quality Scoring",
          body: "Score outputs across performance, collaboration efficiency, and brand consistency to drive improvements.",
        },
      ],
      metrics: [
        {
          label: "Risk Reduction",
          value: "-72%",
          caption: "Fewer compliance incidents",
        },
        {
          label: "Asset Reuse",
          value: "+3.8x",
          caption: "Repeat usage frequency",
        },
        {
          label: "Approval Velocity",
          value: "+56%",
          caption: "Faster review turnaround",
        },
      ],
    },
  },
];
