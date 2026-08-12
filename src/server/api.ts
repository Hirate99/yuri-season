import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";

import { parseAnimeCreate, parseAnimePatch, parseCandidateDraft } from "@worker/api/input";
import { parseCompleteLocalJob, parseHeartbeatLocalJob, parseLeaseLocalJobs } from "@worker/api/job-input";
import { parseResourceEnvelope, parseResourceKind, parseResourceWrite } from "@worker/api/resource-input";
import { parseWithSchema } from "@worker/api/schema";
import { parseSearchMemoryBatch } from "@worker/api/search-memory-input";
import { parseSeasonWrite } from "@worker/api/season-input";
import { parseSourceChecks } from "@worker/api/source-check-input";
import { requireAdmin } from "@worker/auth";
import { HttpError } from "@worker/http";
import { readAdminDashboard } from "@worker/repositories/admin";
import { createAdminResource, deleteAdminResource, updateAdminResource } from "@worker/repositories/admin-resource-mutations";
import { readAdminAnimeResources } from "@worker/repositories/admin-resources";
import { readCalendar, readCalendarForSeason, readCatalog, readCatalogForSeason, readSeasons } from "@worker/repositories/catalog";
import { readAnimeDetail } from "@worker/repositories/detail";
import { readDiscussions, readFeed, readMedia } from "@worker/repositories/feed";
import { applyCandidateDecision, createAnime, createCandidate, patchAnime } from "@worker/repositories/mutations";
import { readSearchMemory, readSearchMemoryHits, rememberSearch } from "@worker/repositories/search-memory";
import { createSeason, updateSeason } from "@worker/repositories/season-mutations";
import { recordSourceChecks } from "@worker/repositories/source-checks";
import { ingestResearchBatch } from "@worker/research/batch";
import { completeLocalJob, heartbeatLocalJob, leaseLocalJobs } from "@worker/research/local-jobs";
import { runResearch } from "@worker/research/scheduler";

type ApiEnvironment = { Bindings: Env };
type ApiContext = Context<ApiEnvironment>;

const PUBLIC_CACHE = "public, max-age=30, stale-while-revalidate=120";
const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i;
const contentClassSchema = z.enum([
  "schedule", "official_news", "official_art", "creator_art", "birthday",
  "cast_post", "staff_post", "fanwork", "community_thread",
]);

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(80).default(40),
  q: z.string().max(120).optional(),
  anime: z.string().max(100).optional(),
  cursor: z.string().max(500).optional(),
  classes: z.string().max(500).default("").transform((value) => value.split(",")
    .flatMap((item) => {
      const result = contentClassSchema.safeParse(item);
      return result.success ? [result.data] : [];
    })),
});

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

async function jsonInput<T>(context: ApiContext, parse: (input: unknown) => T): Promise<T> {
  if (!JSON_CONTENT_TYPE.test(context.req.header("content-type") ?? "")) {
    throw new HttpError(415, "请求需要使用 JSON。");
  }
  try {
    return parse(await context.req.json());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "请求内容不是有效的 UTF-8 JSON。");
  }
}

function publicJson(context: ApiContext, data: object): Response {
  context.header("cache-control", PUBLIC_CACHE);
  return context.json(data);
}

const decisionSchema = z.object({
  decision: z.enum(["publish", "hold", "reject", "withdraw"], "未知的审核决定。"),
  reason: z.string().trim().max(300, "reason 过长。").default(""),
}).refine((value) => value.decision !== "withdraw" || value.reason.length > 0, {
  message: "撤回需要填写 reason。",
  path: ["reason"],
});

const researchRunSchema = z.object({
  lane: z.enum(["rapid", "standard", "discovery"], "未知的更新通道。").default("standard"),
});

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

api.get("/api/health", (context) => context.json({ ok: true, now: new Date().toISOString() }));

api.get("/api/catalog", async (context) => publicJson(context, await readCatalog(context.env.DB)));
api.get("/api/calendar", async (context) => publicJson(context, await readCalendar(context.env.DB)));
api.get("/api/seasons", async (context) => publicJson(context, await readSeasons(context.env.DB)));
api.get("/api/seasons/:slug", async (context) =>
  publicJson(context, await readCatalogForSeason(context.env.DB, context.req.param("slug"))));
api.get("/api/seasons/:slug/calendar", async (context) =>
  publicJson(context, await readCalendarForSeason(context.env.DB, context.req.param("slug"))));

api.get("/api/feed", async (context) => {
  const query = parseWithSchema(feedQuerySchema, context.req.query());
  return publicJson(context, await readFeed(context.env.DB, {
    limit: query.limit,
    query: query.q,
    animeSlug: query.anime,
    contentClasses: query.classes,
    cursor: query.cursor,
  }));
});

api.get("/api/anime/:slug", async (context) => {
  const anime = await readAnimeDetail(context.env.DB, context.req.param("slug"));
  if (!anime) throw new HttpError(404, "没有找到这部动画。");
  const [feed, media, discussions] = await Promise.all([
    readFeed(context.env.DB, { animeId: anime.id, limit: 40 }),
    readMedia(context.env.DB, anime.id),
    readDiscussions(context.env.DB, anime.id),
  ]);
  return publicJson(context, { anime, feed: feed.items, media, discussions });
});

api.get("/api/admin/dashboard", async (context) => context.json(await readAdminDashboard(context.env.DB)));

api.post("/api/admin/anime", async (context) => {
  const value = await jsonInput(context, parseAnimeCreate);
  return context.json({ id: await createAnime(context.env.DB, value) }, 201);
});

api.patch("/api/admin/anime/:id", async (context) => {
  await patchAnime(context.env.DB, context.req.param("id"), await jsonInput(context, parseAnimePatch));
  return context.json({ ok: true });
});

api.get("/api/admin/anime/:id/resources", async (context) =>
  context.json(await readAdminAnimeResources(context.env.DB, context.req.param("id"))));

api.post("/api/admin/anime/:id/resources", async (context) => {
  const id = await createAdminResource(
    context.env.DB,
    context.req.param("id"),
    await jsonInput(context, parseResourceEnvelope),
  );
  return context.json({ id }, 201);
});

api.patch("/api/admin/anime/:animeId/resources/:kind/:id", async (context) => {
  const kind = parseResourceKind(context.req.param("kind"));
  await updateAdminResource(
    context.env.DB,
    context.req.param("animeId"),
    kind,
    context.req.param("id"),
    await jsonInput(context, (input) => parseResourceWrite(kind, input)),
  );
  return context.json({ ok: true });
});

api.delete("/api/admin/anime/:animeId/resources/:kind/:id", async (context) => {
  const kind = parseResourceKind(context.req.param("kind"));
  if (kind === "source") throw new HttpError(400, "请停用来源，不直接删除历史来源。");
  await deleteAdminResource(context.env.DB, context.req.param("animeId"), kind, context.req.param("id"));
  return context.body(null, 204);
});

api.post("/api/admin/seasons", async (context) => {
  const id = await createSeason(context.env.DB, await jsonInput(context, parseSeasonWrite));
  return context.json({ id }, 201);
});

api.patch("/api/admin/seasons/:id", async (context) => {
  await updateSeason(context.env.DB, context.req.param("id"), await jsonInput(context, parseSeasonWrite));
  return context.json({ ok: true });
});

api.post("/api/admin/candidates", async (context) => {
  const id = await createCandidate(context.env.DB, await jsonInput(context, parseCandidateDraft));
  return context.json({ id }, 201);
});

api.post("/api/admin/candidates/:id/decision", async (context) => {
  const input = await jsonInput(context, (value) => parseWithSchema(decisionSchema, value));
  await applyCandidateDecision(context.env.DB, context.req.param("id"), input.decision, {
    reviewerType: "admin",
    reasons: input.reason ? [input.reason] : [],
  });
  return context.json({ ok: true });
});

api.post("/api/admin/batches", async (context) => {
  const input = await jsonInput(context, (value) => value);
  return context.json(await ingestResearchBatch(context.env.DB, input), 202);
});

api.post("/api/admin/jobs/lease", async (context) => {
  const input = await jsonInput(context, parseLeaseLocalJobs);
  return context.json({ jobs: await leaseLocalJobs(context.env.DB, input.owner, input.limit) });
});

api.post("/api/admin/jobs/:id/heartbeat", async (context) => {
  const input = await jsonInput(context, parseHeartbeatLocalJob);
  return context.json(await heartbeatLocalJob(context.env.DB, context.req.param("id"), input.leaseToken));
});

api.post("/api/admin/jobs/:id/complete", async (context) =>
  context.json(await completeLocalJob(
    context.env.DB,
    context.req.param("id"),
    await jsonInput(context, parseCompleteLocalJob),
  )));

api.get("/api/admin/research/memory", async (context) => {
  const includeHits = context.req.query("includeHits") === "1";
  return context.json({
    records: await readSearchMemory(context.env.DB),
    ...(includeHits ? { hits: await readSearchMemoryHits(context.env.DB) } : {}),
  });
});

api.post("/api/admin/research/memory", async (context) =>
  context.json(await rememberSearch(context.env.DB, await jsonInput(context, parseSearchMemoryBatch))));

api.post("/api/admin/research/source-checks", async (context) =>
  context.json(await recordSourceChecks(context.env.DB, await jsonInput(context, parseSourceChecks))));

api.post("/api/admin/research/run", async (context) => {
  const { lane } = await jsonInput(context, (value) => parseWithSchema(researchRunSchema, value));
  return context.json(await runResearch(context.env, lane, "admin"), 202);
});
