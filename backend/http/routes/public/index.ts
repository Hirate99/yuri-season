import { Hono } from "hono";

import type { ApiEnvironment } from "~/http/shared";
import { animeRoutes } from "./anime";
import { catalogRoutes } from "./catalog";
import { feedRoutes } from "./feed";
import { publicationRoutes } from "./publications";

export const publicRoutes = new Hono<ApiEnvironment>()
  .basePath("/api")
  .route("/", catalogRoutes)
  .route("/", feedRoutes)
  .route("/", publicationRoutes)
  .route("/", animeRoutes);
