import startHandler from "@tanstack/react-start/server-entry";
import { api } from "~/http/api";
import { redirectPublicAdmin } from "~/platform/admin-boundary";
import { laneForCron, runResearch } from "~/research/scheduler";
import { publicApiOriginFromRequest, viewerTimeZoneFromRequest, type ServerRequestContext } from "./server-context";

function withServerTiming(response: Response, name: string, startedAt: number): Response {
  const headers = new Headers(response.headers);
  headers.append("server-timing", `${name};dur=${(performance.now() - startedAt).toFixed(1)}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, executionContext) {
    const adminRedirect = redirectPublicAdmin(request, env);
    if (adminRedirect) return adminRedirect;

    if (new URL(request.url).pathname.startsWith("/api/")) {
      return api.fetch(request, env, executionContext);
    }

    const startedAt = performance.now();
    const context: ServerRequestContext = {
      env,
      executionContext,
      viewerTimeZone: viewerTimeZoneFromRequest(request),
      publicApiOrigin: publicApiOriginFromRequest(request),
    };
    const response = await startHandler.fetch(request, { context });
    return withServerTiming(response, "ssr", startedAt);
  },

  scheduled(controller, env, executionContext): void {
    if (String(env.UPDATE_MODE) !== "worker") {
      console.info(JSON.stringify({ event: "scheduled_update_skipped", mode: env.UPDATE_MODE, cron: controller.cron }));
      return;
    }
    executionContext.waitUntil(runResearch(env, laneForCron(controller.cron), "cron"));
  },
} satisfies ExportedHandler<Env>;
