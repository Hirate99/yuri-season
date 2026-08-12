import type { ServerRequestContext } from "./server-context";

export type RouterContext = {
  serverContext?: ServerRequestContext;
};
