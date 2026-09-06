import { Hono } from "hono";

import {
  completeLocalJobSchema,
  heartbeatLocalJobSchema,
  leaseLocalJobsSchema,
} from "~/http/input/job-input";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

export const jobRoutes = new Hono<ApiEnvironment>()
  .post("/jobs/lease", validate("json", leaseLocalJobsSchema), async (context) => {
    const input = context.req.valid("json");
    return context.json({ jobs: await context.var.services.research.jobs.lease(input.owner, input.limit) });
  })
  .post(
    "/jobs/:id/heartbeat",
    validate("json", heartbeatLocalJobSchema),
    async (context) => {
      const input = context.req.valid("json");
      return context.json(await context.var.services.research.jobs.heartbeat(
        context.req.param("id"),
        input.leaseToken,
      ));
    },
  )
  .post(
    "/jobs/:id/complete",
    validate("json", completeLocalJobSchema),
    async (context) => context.json(await context.var.services.research.jobs.complete(
      context.req.param("id"),
      context.req.valid("json"),
    )),
  );
