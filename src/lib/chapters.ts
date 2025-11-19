import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { Chapter } from "@/types/chapter";

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
  ];
}

// 为了向后兼容，保留原来的导出（但标记为已废弃）
// 注意：这个导出不支持国际化，应该使用 getChapters(i18n) 代替
/** @deprecated 使用 getChapters(i18n) 代替 */
export const chapters: Chapter[] = [];
