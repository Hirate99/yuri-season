import startHandler from "@tanstack/react-start/server-entry";
import { laneForCron, runResearch } from "@worker/research/scheduler";
import type { ServerRequestContext } from "./server-context";
import { redirectPublicAdmin } from "./server/admin-boundary";
import { api } from "./server/api";

export default {
  fetch(request, env, executionContext) {
    const adminRedirect = redirectPublicAdmin(request, env);
    if (adminRedirect) return adminRedirect;

    if (new URL(request.url).pathname.startsWith("/api/")) {
      return api.fetch(request, env, executionContext);
    }

    const context: ServerRequestContext = { env, executionContext };
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
