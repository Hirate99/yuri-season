export type ServerRequestContext = {
  env: Env;
  executionContext: ExecutionContext;
  viewerTimeZone: string;
  publicApiOrigin?: string;
};

const DEFAULT_TIME_ZONE = "Asia/Tokyo";
const PRODUCTION_PUBLIC_ORIGIN = "https://i-yuri.com";

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

export function publicApiOriginFromRequest(
  request: Request,
  development = import.meta.env.DEV,
): string | undefined {
  return development && request.headers.get("x-yuri-production-data") === "1"
    ? PRODUCTION_PUBLIC_ORIGIN
    : undefined;
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
