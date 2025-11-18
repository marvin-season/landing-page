import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { Chapter } from "./types";

export function getChapters(i18n: I18n): Chapter[] {
  return [
    {
      link: "https://ds.fuelstack.icu/",
      id: "engineering",
      title: i18n._(msg`Engineering-First AI Studio`),
      tagline: i18n._(msg`AI orchestrates every step of content production.`),
      summary: i18n._(
        msg`Full-stack automation integrates design systems, documentation, UI components, and delivery for seamless engineering productivity.`,
      ),
      excerpt: i18n._(
        msg`A unified workspace built around engineering best practices. From Shadcn UI design system and automated Fumadocs documentation, to UI automation and robust docs integration—engineers can scale content delivery globally with optimal tooling.`,
      ),
      keywords: [
        i18n._(msg`Engineering`),
        i18n._(msg`Design System`),
        i18n._(msg`Component System`),
        i18n._(msg`UI Automation`),
        i18n._(msg`Docs Integration`),
        i18n._(msg`Shadcn UI`),
        i18n._(msg`Fumadocs`),
        i18n._(msg`Developer Experience`),
        i18n._(msg`Documentation Automation`),
      ],
      content: {
        hero: i18n._(
          msg`Achieve unmatched consistency and velocity with Shadcn UI components and Fumadocs-powered automated documentation—putting engineers in control of the AI content lifecycle.`,
        ),
        description: i18n._(
          msg`The AI Studio harnesses a state-of-the-art component system (Shadcn UI), deeply coupled with live, automated documentation (Fumadocs). Design, code, and docs are always in sync, enabling engineering teams to maintain quality, iterate rapidly, and scale confidently.`,
        ),
        bullets: [
          {
            title: i18n._(msg`Unified Design System`),
            body: i18n._(
              msg`Shadcn UI underpins the studio's visual language, offering accessible, reusable, and consistent components for fast, error-free development.`,
            ),
          },
          {
            title: i18n._(msg`Automated Live Documentation`),
            body: i18n._(
              msg`Fumadocs keeps component and API documentation always current—complete with live code previews—so every update is immediately reflected across platforms.`,
            ),
          },
          {
            title: i18n._(msg`Developer-Centric Workflow`),
            body: i18n._(
              msg`Hot-reload capabilities, flexible theming, and atomic design patterns help engineers deploy new features fast. Docs and UI always update in lockstep.`,
            ),
          },
          {
            title: i18n._(msg`Robust UI Automation`),
            body: i18n._(
              msg`UI automation and docs integration ensure updates flow instantly from the codebase to all internal and external endpoints for a true single source of truth.`,
            ),
          },
          {
            title: i18n._(msg`Built for Extensibility`),
            body: i18n._(
              msg`Easily add new Shadcn-based components—Fumadocs instantly documents them across all use cases, minimizing onboarding and maintenance overhead.`,
            ),
          },
        ],
        metrics: [
          {
            label: i18n._(msg`Design System Adoption`),
            value: "100%",
            caption: i18n._(
              msg`All UI uses Shadcn UI—customizable, accessible, and consistent components.`,
            ),
          },
          {
            label: i18n._(msg`Doc Coverage`),
            value: "100%",
            caption: i18n._(
              msg`Every feature, API, and UI element documented via Fumadocs.`,
            ),
          },
          {
            label: i18n._(msg`Time-to-Delivery`),
            value: "2.5x",
            caption: i18n._(
              msg`Faster release cycles vs. legacy stacks due to unified automation.`,
            ),
          },
          {
            label: i18n._(msg`Developer Onboarding`),
            value: "-40%",
            caption: i18n._(
              msg`Faster onboarding via documentation and component system synergy.`,
            ),
          },
        ],
      },
    },
    {
      id: "workflow",
      title: i18n._(msg`Intelligent Creative Workflows`),
      tagline: i18n._(msg`AI orchestrates every step of content production.`),
      summary: i18n._(
        msg`Automation keeps every stage from inspiration to delivery aligned.`,
      ),
      excerpt: i18n._(
        msg`Build a closed-loop workspace for ideation, proofreading, and distribution while keeping your brand voice consistent.`,
      ),
      keywords: [
        i18n._(msg`Multimodal Templates`),
        i18n._(msg`Audience Adaptation`),
        i18n._(msg`Team Collaboration`),
      ],
      content: {
        hero: i18n._(
          msg`Connect every node between inspiration and publication so collaboration stays traceable, reusable, and optimizable.`,
        ),
        description: i18n._(
          msg`String together idea capture, generation, review, and omnichannel distribution. A visual orchestrator and strategy engine give your team a tireless AI partner.`,
        ),
        bullets: [
          {
            title: i18n._(msg`Workflow Orchestration`),
            body: i18n._(
              msg`Drag-and-drop multimodal templates and auto-distribute to each channel, eliminating repetitive cross-platform work.`,
            ),
          },
          {
            title: i18n._(msg`Brand Voice Guardrails`),
            body: i18n._(
              msg`Reference your brand corpus in real time to keep tone and style consistent for every external touchpoint.`,
            ),
          },
          {
            title: i18n._(msg`Team Sync`),
            body: i18n._(
              msg`Role-based permissions with comments, annotations, and history let teams collaborate smoothly across key checkpoints.`,
            ),
          },
          {
            title: i18n._(msg`Intelligent Proofreading`),
            body: i18n._(
              msg`Generate multi-dimensional review suggestions automatically to keep every output professional, compliant, and on-brand.`,
            ),
          },
        ],
        metrics: [
          {
            label: i18n._(msg`Efficiency Boost`),
            value: "3.2x",
            caption: i18n._(msg`Average delivery cycle reduced`),
          },
          {
            label: i18n._(msg`Consistency`),
            value: "97%",
            caption: i18n._(msg`Brand voice alignment`),
          },
          {
            label: i18n._(msg`Feedback Convergence`),
            value: "-48%",
            caption: i18n._(msg`Fewer revision loops`),
          },
        ],
      },
    },
    {
      id: "co-writing",
      title: i18n._(msg`AI Co-Creation Studio`),
      tagline: i18n._(msg`Ideas first, finished assets fast.`),
      summary: i18n._(
        msg`Turn AI into a senior creative partner that links ideation, scripts, and execution.`,
      ),
      excerpt: i18n._(
        msg`Outline-driven workflows keep ideas flowing while decisions and context stay synchronized.`,
      ),
      keywords: [
        i18n._(msg`Multi-role Collaboration`),
        i18n._(msg`Context Memory`),
        i18n._(msg`Real-time Co-writing`),
      ],
      content: {
        hero: i18n._(
          msg`Ground every project in shared context and multi-role co-writing so ideas iterate within a unified narrative.`,
        ),
        description: i18n._(
          msg`Context caching and AI personas help the assistant understand your team's vocabulary. Whether you need outlines, scripts, or copy decks, iterate continuously in a single context.`,
        ),
        bullets: [
          {
            title: i18n._(msg`Context Memory`),
            body: i18n._(
              msg`Auto-store project background and glossaries so everyone, including every AI assistant, creates in sync.`,
            ),
          },
          {
            title: i18n._(msg`AI Personas`),
            body: i18n._(
              msg`Spin up strategist, copywriter, or designer personas that deliver task-specific perspectives instantly.`,
            ),
          },
          {
            title: i18n._(msg`Live Co-Writing`),
            body: i18n._(
              msg`As teammates edit together, AI suggests supporting paragraphs and assets based on the shared context.`,
            ),
          },
          {
            title: i18n._(msg`Inspiration Stack`),
            body: i18n._(
              msg`Archive inspiration, references, and feedback for quick recall whenever you're ready to keep writing.`,
            ),
          },
        ],
        metrics: [
          {
            label: i18n._(msg`Creative Turnaround`),
            value: "1/2",
            caption: i18n._(msg`Average planning time cut in half`),
          },
          {
            label: i18n._(msg`Collaboration Adoption`),
            value: "84%",
            caption: i18n._(msg`Daily active team usage`),
          },
          {
            label: i18n._(msg`Idea Hit Rate`),
            value: "+62%",
            caption: i18n._(msg`First-round proposal approvals`),
          },
        ],
      },
    },
    {
      id: "insight",
      title: i18n._(msg`Insight-Driven Growth Content`),
      tagline: i18n._(msg`Calibrate every message with data.`),
      summary: i18n._(
        msg`Blend marketing data, customer feedback, and sentiment into actionable insights.`,
      ),
      excerpt: i18n._(
        msg`Let insights and content feed each other so every expression becomes sharper.`,
      ),
      keywords: [
        i18n._(msg`Behavior Insights`),
        i18n._(msg`Sentiment Loop`),
        i18n._(msg`A/B Validation`),
      ],
      content: {
        hero: i18n._(
          msg`Real-time insight pipelines guide creative direction, recommend expressions, and feed back performance automatically.`,
        ),
        description: i18n._(
          msg`Pull behavior data, channel feedback, and competitor sentiment into targeted recommendations. Once content ships, performance metrics refine strategy, creating a self-improving growth loop.`,
        ),
        bullets: [
          {
            title: i18n._(msg`Insight Dashboard`),
            body: i18n._(
              msg`Aggregate multi-channel data and cluster intent semantically so emerging opportunities are obvious.`,
            ),
          },
          {
            title: i18n._(msg`Expression Suggestions`),
            body: i18n._(
              msg`Receive tone, structure, and asset tips tailored to each audience, reducing guesswork.`,
            ),
          },
          {
            title: i18n._(msg`Performance Feedback`),
            body: i18n._(
              msg`Capture campaign performance automatically and quantify the impact of each message on conversion.`,
            ),
          },
          {
            title: i18n._(msg`Learning Loop`),
            body: i18n._(
              msg`Continuously train a private brand model so future content reuses proven narratives.`,
            ),
          },
        ],
        metrics: [
          {
            label: i18n._(msg`Return on Spend`),
            value: "+41%",
            caption: i18n._(msg`Average conversion lift`),
          },
          {
            label: i18n._(msg`Insight Speed`),
            value: "-68%",
            caption: i18n._(msg`Time from data to action`),
          },
          {
            label: i18n._(msg`Iteration Pace`),
            value: "24h",
            caption: i18n._(msg`Hot topic response cycle`),
          },
        ],
      },
    },
    {
      id: "governance",
      title: i18n._(msg`Content Governance & Asset Hub`),
      tagline: i18n._(msg`Keep content assets safe and accountable.`),
      summary: i18n._(
        msg`Build a secure, traceable, and controllable content asset center covering end-to-end governance.`,
      ),
      excerpt: i18n._(
        msg`Protect compliance while making every asset measurable, reusable, and ready to scale.`,
      ),
      keywords: [
        i18n._(msg`Asset Archiving`),
        i18n._(msg`Permission Model`),
        i18n._(msg`Quality Scoring`),
      ],
      content: {
        hero: i18n._(
          msg`Generate content efficiently and turn it into reusable assets while staying safe, controlled, and transparent.`,
        ),
        description: i18n._(
          msg`Govern creation, approval, publishing, and archiving with granular permissions and quality scoring so every output remains within guardrails.`,
        ),
        bullets: [
          {
            title: i18n._(msg`Granular Permissions`),
            body: i18n._(
              msg`Apply segment-level access and safely extend collaboration to external partners when needed.`,
            ),
          },
          {
            title: i18n._(msg`Compliance Monitoring`),
            body: i18n._(
              msg`Use built-in sensitive term libraries, rights checks, and generation history to reduce exposure.`,
            ),
          },
          {
            title: i18n._(msg`Structured Assets`),
            body: i18n._(
              msg`Automatically structure content into modular assets for effortless reuse across projects.`,
            ),
          },
          {
            title: i18n._(msg`Quality Scoring`),
            body: i18n._(
              msg`Score outputs across performance, collaboration efficiency, and brand consistency to drive improvements.`,
            ),
          },
        ],
        metrics: [
          {
            label: i18n._(msg`Risk Reduction`),
            value: "-72%",
            caption: i18n._(msg`Fewer compliance incidents`),
          },
          {
            label: i18n._(msg`Asset Reuse`),
            value: "+3.8x",
            caption: i18n._(msg`Repeat usage frequency`),
          },
          {
            label: i18n._(msg`Approval Velocity`),
            value: "+56%",
            caption: i18n._(msg`Faster review turnaround`),
          },
        ],
      },
    },
  ];
}

// 为了向后兼容，保留原来的导出（但标记为已废弃）
// 注意：这个导出不支持国际化，应该使用 getChapters(i18n) 代替
/** @deprecated 使用 getChapters(i18n) 代替 */
export const chapters: Chapter[] = [];
