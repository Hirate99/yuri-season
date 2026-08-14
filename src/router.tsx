import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { RouterContext } from "./router-context";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    // TanStack Start adds the per-request Worker context through
    // `additionalContext` during SSR.  Do not shadow it with an explicit
    // `undefined` value in the router's base context.
    context: {} satisfies RouterContext,
  });
}

declare module "@tanstack/react-router" {
  interface Register { router: ReturnType<typeof getRouter> }
}

declare module "@tanstack/history" {
  interface HistoryState { yuriReturnToPrevious?: boolean }
}
