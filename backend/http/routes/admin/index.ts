import { Hono } from "hono";

import type { ApiEnvironment } from "~/http/shared";
import { animeRoutes } from "./anime";
import { dashboardRoutes } from "./dashboard";
import { moderationRoutes } from "./moderation";
import { resourceRoutes } from "./resources";
import { seasonRoutes } from "./seasons";

export const adminRoutes = new Hono<ApiEnvironment>()
  .basePath("/api/admin")
  .route("/", dashboardRoutes)
  .route("/", animeRoutes)
  .route("/", resourceRoutes)
  .route("/", moderationRoutes)
  .route("/", seasonRoutes);
