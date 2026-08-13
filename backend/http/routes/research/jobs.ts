import { Hono } from "hono";

import {
  parseCompleteLocalJob,
  parseHeartbeatLocalJob,
  parseLeaseLocalJobs,
  type CompleteLocalJobRequest,
  type HeartbeatLocalJobInput,
  type HeartbeatLocalJobRequest,
  type LeaseLocalJobsInput,
  type LeaseLocalJobsRequest,
} from "~/http/input/job-input";
import type { CompleteLocalJobInput } from "~/research/types";
import type { ApiEnvironment } from "../../shared";
import { validatedJson } from "../../shared";

export const jobRoutes = new Hono<ApiEnvironment>()
  .post("/jobs/lease", validatedJson<LeaseLocalJobsRequest, LeaseLocalJobsInput>(parseLeaseLocalJobs), async (context) => {
    const input = context.req.valid("json");
    return context.json({ jobs: await context.var.services.research.jobs.lease(input.owner, input.limit) });
  })
  .post(
    "/jobs/:id/heartbeat",
    validatedJson<HeartbeatLocalJobRequest, HeartbeatLocalJobInput>(parseHeartbeatLocalJob),
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
    validatedJson<CompleteLocalJobRequest, CompleteLocalJobInput>(parseCompleteLocalJob),
    async (context) => context.json(await context.var.services.research.jobs.complete(
      context.req.param("id"),
      context.req.valid("json"),
    )),
  );
