import startHandler from "@tanstack/react-start/server-entry";
import { api } from "~/http/api";
import { redirectPublicAdmin } from "~/platform/admin-boundary";
import { laneForCron, runResearch } from "~/research/scheduler";
import { viewerTimeZoneFromRequest, type ServerRequestContext } from "./server-context";

export default {
  fetch(request, env, executionContext) {
    const adminRedirect = redirectPublicAdmin(request, env);
    if (adminRedirect) return adminRedirect;

    if (new URL(request.url).pathname.startsWith("/api/")) {
      return api.fetch(request, env, executionContext);
    }

    const context: ServerRequestContext = {
      env,
      executionContext,
      viewerTimeZone: viewerTimeZoneFromRequest(request),
    };
    return startHandler.fetch(request, { context });
  },

  scheduled(controller, env, executionContext): void {
    if (String(env.UPDATE_MODE) !== "worker") {
      console.info(JSON.stringify({ event: "scheduled_update_skipped", mode: env.UPDATE_MODE, cron: controller.cron }));
      return;
    }
    executionContext.waitUntil(runResearch(env, laneForCron(controller.cron), "cron"));
  },
} satisfies ExportedHandler<Env>;
