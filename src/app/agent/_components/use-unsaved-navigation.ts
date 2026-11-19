"use client";

import { useLayoutEffect } from "react";

const leaveEvent = "agent:confirm-navigation";

export function confirmAgentNavigation() {
  return window.dispatchEvent(new Event(leaveEvent, { cancelable: true }));
}

export function useUnsavedNavigation(dirty: boolean, message: string) {
  useLayoutEffect(() => {
    if (!dirty) return;
    const currentUrl = new URL(window.location.href);
    // Restore the current Next.js entry if a browser already committed a traversal.
    const currentState = window.history.state;
    const isSamePage = (url: URL) =>
      url.origin === currentUrl.origin &&
      url.pathname === currentUrl.pathname &&
      url.search === currentUrl.search;
    let approvedTraversal: string | undefined;

    function confirm(event: Event) {
      if (!window.confirm(message)) event.preventDefault();
    }

    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }

    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element &&
        event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== currentUrl.origin || isSamePage(url)) return;
      if (!confirmAgentNavigation()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function traverse(event: NavigateEvent) {
      approvedTraversal = undefined;
      if (
        event.navigationType !== "traverse" ||
        !event.cancelable ||
        !event.destination.sameDocument ||
        isSamePage(new URL(event.destination.url))
      )
        return;
      if (confirmAgentNavigation()) approvedTraversal = event.destination.url;
      else event.preventDefault();
    }

    function popState(event: PopStateEvent) {
      const url = new URL(window.location.href);
      if (isSamePage(url) || approvedTraversal === url.href) {
        approvedTraversal = undefined;
        return;
      }
      if (confirmAgentNavigation()) return;
      event.stopImmediatePropagation();
      window.history.pushState(currentState, "", currentUrl);
    }

    window.addEventListener(leaveEvent, confirm);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("click", click, true);
    window.addEventListener("popstate", popState, true);
    window.navigation?.addEventListener("navigate", traverse);
    return () => {
      window.removeEventListener(leaveEvent, confirm);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popState, true);
      window.navigation?.removeEventListener("navigate", traverse);
    };
  }, [dirty, message]);
}
