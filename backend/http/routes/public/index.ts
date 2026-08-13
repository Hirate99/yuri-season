import { Hono } from "hono";

import type { ApiEnvironment } from "../../shared";
import { animeRoutes } from "./anime";
import { catalogRoutes } from "./catalog";
import { feedRoutes } from "./feed";

export const publicRoutes = new Hono<ApiEnvironment>().basePath("/api")
  .route("/", catalogRoutes)
  .route("/", feedRoutes)
  .route("/", animeRoutes);
