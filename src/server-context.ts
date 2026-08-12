export type ServerRequestContext = {
  env: Env;
  executionContext: ExecutionContext;
};

export function serverContextFromLoader(loaderContext: unknown) {
  return (loaderContext as { serverContext?: ServerRequestContext }).serverContext;
}

declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: ServerRequestContext;
    };
  }
}
