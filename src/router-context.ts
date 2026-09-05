import type { ServerRequestContext } from "./server-context";
import type { QueryClient } from "@tanstack/react-query";

export type RouterContext = {
  queryClient: QueryClient;
  serverContext?: ServerRequestContext;
};
