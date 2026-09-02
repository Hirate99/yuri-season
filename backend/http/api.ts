import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";

import { createRequestServices } from "~/application/services";
import { requireAdmin } from "~/infrastructure/auth";
import { HttpError } from "~/shared/http-error";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import { researchRoutes } from "./routes/research";
import type { ApiEnvironment } from "./shared";

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

const app = new Hono<ApiEnvironment>();

app.use("/api/*", async (context, next) => {
  const startedAt = performance.now();
  context.set("services", createRequestServices(context.env));
  await next();
  context.res.headers.append("server-timing", `api;dur=${(performance.now() - startedAt).toFixed(1)}`);
  if (!context.res.headers.has("cache-control")) context.res.headers.set("cache-control", "no-store");
});

app.use("/api/admin/*", bodyLimit({
  maxSize: 4 * 1024 * 1024,
  onError: (context) => context.json(
    { error: "request_failed", message: "请求内容过大。" },
    413,
    { "cache-control": "no-store" },
  ),
}));

app.use("/api/admin/*", async (context, next) => {
  const principal = await requireAdmin(context.req.raw, context.env);
  context.set("services", createRequestServices(context.env, principal));
  await next();
});

app.onError((error, context) => {
  if (error instanceof HttpError) {
    return context.json({ error: "request_failed", message: error.message }, error.status as 400);
  }
  if (error instanceof HTTPException) {
    const message = error.status === 400 ? "请求内容不是有效的 UTF-8 JSON。" : error.message;
    return context.json({ error: "request_failed", message }, error.status as 400);
  }
  console.error(JSON.stringify({
    event: "api_request_failed",
    method: context.req.method,
    path: context.req.path,
    message: error instanceof Error ? error.message : String(error),
  }));
  return context.json({ error: "internal_error", message: "服务器暂时无法处理请求。" }, 500);
});

app.notFound((context) => {
  const allow = allowedMethods(context.req.path);
  if (allow.length > 0) {
    context.header("allow", allow.join(", "));
    return context.json({ error: "method_not_allowed", message: "不支持这个请求方式。" }, 405);
  }
  return context.json({ error: "not_found", message: "没有找到这个 API。" }, 404);
});

export const api = app
  .route("/", publicRoutes)
  .route("/", adminRoutes)
  .route("/", researchRoutes);

/** Hono RPC contract consumed by typed clients through hc<ApiType>(). */
export type ApiType = typeof api;
