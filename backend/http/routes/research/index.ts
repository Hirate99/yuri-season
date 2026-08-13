import { Hono } from "hono";

import type { ApiEnvironment } from "../../shared";
import { batchRoutes } from "./batches";
import { jobRoutes } from "./jobs";
import { memoryRoutes } from "./memory";
import { runRoutes } from "./run";

export const researchRoutes = new Hono<ApiEnvironment>().basePath("/api/admin")
  .route("/", batchRoutes)
  .route("/", jobRoutes)
  .route("/", memoryRoutes)
  .route("/", runRoutes);
