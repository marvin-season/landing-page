"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { KnowledgeWorkspace } from "./knowledge-workspace";

export function KnowledgeScenes({ overview }: { overview: ReactNode }) {
  const { t } = useLingui();
  const containerRef = useRef<HTMLElement>(null);
  const returningToOverviewRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [workspaceActive, setWorkspaceActive] = useState(false);
  const [workspaceLocked, setWorkspaceLocked] = useState(false);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const transitionProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    mass: 0.5,
  });
  const overviewOpacity = useTransform(transitionProgress, [0, 0.7], [1, 0]);
  const overviewY = useTransform(transitionProgress, [0, 1], [0, -20]);
  const workspaceOpacity = useTransform(
    transitionProgress,
    [0.2, 0.85],
    [0, 1],
  );
  const workspaceY = useTransform(transitionProgress, [0.2, 1], [24, 0]);
  const workspaceScale = useTransform(transitionProgress, [0.2, 1], [0.985, 1]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setWorkspaceActive(progress >= 0.5);
    if (progress <= 0.001) {
      returningToOverviewRef.current = false;
      setWorkspaceLocked(false);
    } else if (progress >= 0.999 && !returningToOverviewRef.current) {
      // Stop scroll chaining into the overview once the workspace is in place.
      setWorkspaceLocked(true);
    }
  });

  function scrollToScene(workspace: boolean) {
    const container = containerRef.current;
    if (!container) return;
    returningToOverviewRef.current = !workspace;
    if (!workspace) setWorkspaceLocked(false);
    container.focus({ preventScroll: true });
    container.scrollTo({
      top: workspace ? container.clientHeight : 0,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <main
      ref={containerRef}
      tabIndex={0}
      aria-label={t`Docs & Knowledge`}
      data-workspace-locked={workspaceLocked}
      className="h-dvh bg-background text-foreground shinchan:bg-transparent apple:bg-transparent overflow-x-hidden overflow-y-auto overscroll-y-none snap-y snap-mandatory scroll-smooth motion-reduce:scroll-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[workspace-locked=true]:overflow-y-hidden scrollbar-gutter-stable"
    >
      <section
        aria-label={t`Document reading overview`}
        className="h-dvh snap-start snap-always overflow-hidden"
      >
        <motion.div
          inert={workspaceActive}
          aria-hidden={workspaceActive}
          style={{
            opacity: reducedMotion ? 1 : overviewOpacity,
            y: reducedMotion ? 0 : overviewY,
          }}
          className="h-full overflow-y-auto"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
            {overview}
            <div className="mt-auto flex flex-wrap items-center gap-4 pb-2">
              <Button type="button" onClick={() => scrollToScene(true)}>
                <Trans>Open document workspace</Trans>
                <ArrowDown className="size-4" aria-hidden="true" />
              </Button>
              <span className="text-xs text-muted-foreground">
                <Trans>Scroll down to read and quote your document</Trans>
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      <section
        aria-label={t`Default workspace`}
        className="h-dvh snap-start snap-always overflow-hidden"
      >
        <motion.div
          inert={!workspaceActive}
          aria-hidden={!workspaceActive}
          style={{
            opacity: reducedMotion ? 1 : workspaceOpacity,
            y: reducedMotion ? 0 : workspaceY,
            scale: reducedMotion ? 1 : workspaceScale,
          }}
          className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-3 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-4 sm:pb-6"
        >
          <button
            type="button"
            onClick={() => scrollToScene(false)}
            className="inline-flex h-9 w-fit shrink-0 items-center gap-2 pr-12 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10"
          >
            <ArrowUp className="size-3.5" aria-hidden="true" />
            <Trans>Back to overview</Trans>
          </button>
          <KnowledgeWorkspace />
        </motion.div>
      </section>
    </main>
  );
}
