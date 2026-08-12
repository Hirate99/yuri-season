export type ServerRequestContext = {
  env: Env;
  executionContext: ExecutionContext;
  viewerTimeZone: string;
};

const DEFAULT_TIME_ZONE = "Asia/Tokyo";

function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function viewerTimeZoneFromRequest(request: Request): string {
  const timeZone = request.cf?.timezone;
  return validTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

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
