import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { requireAdmin } from "@worker/auth";
import { invalidatePublicCache } from "@worker/cache/public-cache";
import { HttpError } from "@worker/http";
import { registerAdminRoutes } from "./api-admin-routes";
import { registerPublicRoutes } from "./api-public-routes";
import { registerResearchRoutes } from "./api-research-routes";
import type { ApiEnvironment } from "./api-shared";

function routeMatches(routePath: string, requestPath: string): boolean {
  if (routePath.includes("*")) return false;
  const pattern = routePath.split("/").map((segment) =>
    segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("/");
  return new RegExp(`^${pattern}$`).test(requestPath);
}

function allowedMethods(requestPath: string): string[] {
  const methods = new Set(api.routes
    .filter((route) => route.method !== "ALL" && routeMatches(route.path, requestPath))
    .map((route) => route.method));
  if (methods.has("GET")) methods.add("HEAD");
  return [...methods];
}

function shouldInvalidatePublicCache(method: string, path: string): boolean {
  if (method === "GET" || method === "HEAD") return false;
  return path === "/api/admin/batches"
    || path.startsWith("/api/admin/anime")
    || path.startsWith("/api/admin/discussions")
    || path.startsWith("/api/admin/seasons")
    || /^\/api\/admin\/candidates\/[^/]+\/decision$/.test(path);
}

export const api = new Hono<ApiEnvironment>();

api.use("/api/*", async (context, next) => {
  await next();
  if (!context.res.headers.has("cache-control")) context.res.headers.set("cache-control", "no-store");
});

api.use("/api/admin/*", bodyLimit({
  maxSize: 4 * 1024 * 1024,
  onError: (context) => context.json(
    { error: "request_failed", message: "请求内容过大。" },
    413,
    { "cache-control": "no-store" },
  ),
}));

api.use("/api/admin/*", async (context, next) => {
  await requireAdmin(context.req.raw, context.env);
  await next();
  if (context.res.ok && shouldInvalidatePublicCache(context.req.method, context.req.path)) {
    context.executionCtx.waitUntil(invalidatePublicCache(context.env));
  }
});

api.onError((error, context) => {
  if (error instanceof HttpError) {
    return context.json({ error: "request_failed", message: error.message }, error.status as 400);
  }
  console.error(JSON.stringify({
    event: "api_request_failed",
    method: context.req.method,
    path: context.req.path,
    message: error instanceof Error ? error.message : String(error),
  }));
  return context.json({ error: "internal_error", message: "服务器暂时无法处理请求。" }, 500);
});

api.notFound((context) => {
  const allow = allowedMethods(context.req.path);
  if (allow.length > 0) {
    context.header("allow", allow.join(", "));
    return context.json({ error: "method_not_allowed", message: "不支持这个请求方式。" }, 405);
  }
  return context.json({ error: "not_found", message: "没有找到这个 API。" }, 404);
});

registerPublicRoutes(api);
registerAdminRoutes(api);
registerResearchRoutes(api);
