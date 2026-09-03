import { Hono } from "hono";
import { z } from "zod";

import { parseWithSchema } from "~/http/input/schema";
import type { ApiEnvironment } from "~/http/shared";
import { publicJson, validatedQuery } from "~/http/shared";

const contentClassSchema = z.enum([
  "schedule", "official_news", "official_art", "creator_art", "birthday",
  "cast_post", "staff_post", "fanwork", "community_thread",
]);

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(80).default(40),
  q: z.string().max(120).optional(),
  anime: z.string().max(100).optional(),
  cursor: z.string().max(500).optional(),
  classes: z.string().max(500).optional().transform((value, context) => {
    if (value === undefined) return undefined;
    const parsed = value.split(",").map((item) => contentClassSchema.safeParse(item));
    if (parsed.some((item) => !item.success)) {
      context.addIssue({ code: "custom", message: "classes 包含未知的内容分类。" });
      return z.NEVER;
    }
    return parsed.map((item) => item.data!);
  }),
});

type FeedQueryInput = z.input<typeof feedQuerySchema>;
type FeedQuery = z.output<typeof feedQuerySchema>;

export const feedRoutes = new Hono<ApiEnvironment>()
  .get(
    "/feed",
    validatedQuery<FeedQueryInput, FeedQuery>((input) => parseWithSchema(feedQuerySchema, input)),
    async (context) => {
      const query = context.req.valid("query");
      return publicJson(context, await context.var.services.public.feed({
        limit: query.limit,
        query: query.q,
        animeSlug: query.anime,
        contentClasses: query.classes,
        cursor: query.cursor,
      }));
    },
  );
