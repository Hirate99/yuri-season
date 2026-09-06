import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { RouterContext } from "./router-context";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createQueryClient } from "./lib/queries";

export function getRouter() {
  const queryClient = createQueryClient();
  let restoreSpaScroll = false;

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: () => restoreSpaScroll,
    // TanStack Start adds the per-request Worker context through
    // `additionalContext` during SSR.  Do not shadow it with an explicit
    // `undefined` value in the router's base context.
    context: { queryClient } satisfies RouterContext,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  if (typeof window !== "undefined") {
    const unsubscribe = router.subscribe("onRendered", () => {
      restoreSpaScroll = true;
      unsubscribe();
    });
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

declare module "@tanstack/history" {
  interface HistoryState {
    yuriReturnToPrevious?: boolean;
  }
}
