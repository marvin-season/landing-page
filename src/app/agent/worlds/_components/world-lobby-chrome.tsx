"use client";

import { motion, useReducedMotion } from "motion/react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname } from "next/navigation";
import {
  type ContextType,
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { WorldLobbyNav } from "./world-lobby-nav";
import { WorldSignOutButton } from "./world-sign-out-button";

const fadeTransition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

const enterFrom = { opacity: 0, x: -16 };
const enterTo = { opacity: 1, x: 0 };
const leaveTo = { opacity: 0, x: 16 };

type RouterContext = ContextType<typeof LayoutRouterContext>;

type PageSnapshot = {
  pathname: string;
  node: ReactNode;
  context: RouterContext;
};

const WorldLobbyActionsSlotContext = createContext<HTMLElement | null>(null);
const WorldLobbyLiveContext = createContext(true);

/** Render page-specific actions into the stable lobby header. */
export function WorldLobbyHeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(WorldLobbyActionsSlotContext);
  const live = useContext(WorldLobbyLiveContext);
  if (!slot || !live) return null;
  return createPortal(children, slot);
}

function SnapshotPage({
  node,
  context,
}: {
  node: ReactNode;
  context: RouterContext;
}) {
  if (!context) return node;
  return (
    <LayoutRouterContext.Provider value={context}>
      <WorldLobbyLiveContext.Provider value={false}>
        {node}
      </WorldLobbyLiveContext.Provider>
    </LayoutRouterContext.Provider>
  );
}

function LobbyContentFade({ children }: { children: ReactNode }) {
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
    <div className="relative overflow-x-hidden">
      {leaving ? (
        <motion.div
          key={leaving.pathname}
          initial={enterTo}
          animate={leaveTo}
          transition={{ duration, ease: fadeTransition.ease }}
          onAnimationComplete={() => setLeaving(null)}
          className="pointer-events-none absolute inset-0 z-10 w-full overflow-hidden"
        >
          <SnapshotPage node={leaving.node} context={leaving.context} />
        </motion.div>
      ) : null}
      <motion.div
        key={pathname}
        initial={enterFrom}
        animate={enterTo}
        transition={{ duration, ease: fadeTransition.ease }}
        className="w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function WorldLobbyChrome({ children }: { children: ReactNode }) {
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  return (
    <WorldLobbyActionsSlotContext.Provider value={actionsSlot}>
      <div className="min-h-full px-5 py-6 text-foreground sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 @container">
          <header className="flex flex-col gap-3 border-b border-border pb-4 @3xl:flex-row @3xl:items-center @3xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <h1 className="font-serif text-2xl font-normal">开放世界</h1>
              <WorldLobbyNav />
            </div>
            <div className="flex min-h-9 shrink-0 flex-wrap items-center justify-end gap-2">
              <div
                ref={setActionsSlot}
                className="flex flex-wrap items-center gap-2 empty:hidden"
              />
              <WorldSignOutButton />
            </div>
          </header>
          <LobbyContentFade>{children}</LobbyContentFade>
        </div>
      </div>
    </WorldLobbyActionsSlotContext.Provider>
  );
}
