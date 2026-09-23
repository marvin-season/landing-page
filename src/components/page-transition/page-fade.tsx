"use client";

import { motion, useReducedMotion } from "motion/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname } from "next/navigation";
import {
  type ContextType,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";

const fadeTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
};

const enterFrom = { opacity: 0, x: -24 };
const enterTo = { opacity: 1, x: 0 };
const leaveTo = { opacity: 0, x: 24 };

type RouterContext = ContextType<typeof LayoutRouterContext>;

type PageSnapshot = {
  pathname: string;
  node: ReactNode;
  context: RouterContext;
};

function SnapshotPage({
  node,
  context,
}: {
  node: ReactNode;
  context: RouterContext;
}) {
  if (!context) {
    return node;
  }

  return (
    <LayoutRouterContext.Provider value={context}>
      {node}
    </LayoutRouterContext.Provider>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const context = useContext(LayoutRouterContext);
  const reducedMotion = useReducedMotion();
  const snapshotRef = useRef<PageSnapshot>({
    pathname,
    node: children,
    context,
  });
  const [leaving, setLeaving] = useState<PageSnapshot | null>(null);

  if (snapshotRef.current.pathname !== pathname) {
    if (!reducedMotion) {
      setLeaving(snapshotRef.current);
    }
    snapshotRef.current = { pathname, node: children, context };
  } else {
    snapshotRef.current.node = children;
    snapshotRef.current.context = context;
  }

  const duration = reducedMotion ? 0 : fadeTransition.duration;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      {leaving ? (
        <motion.div
          key={leaving.pathname}
          initial={enterTo}
          animate={leaveTo}
          transition={{ duration, ease: fadeTransition.ease }}
          onAnimationComplete={() => setLeaving(null)}
          className="pointer-events-none absolute inset-0 z-10 min-h-dvh w-full overflow-hidden"
        >
          <SnapshotPage node={leaving.node} context={leaving.context} />
        </motion.div>
      ) : null}
      <motion.div
        key={pathname}
        initial={enterFrom}
        animate={enterTo}
        transition={{ duration, ease: fadeTransition.ease }}
        className="min-h-dvh w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
