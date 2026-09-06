import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  likeInput,
  communityPageInput,
  moderationInput,
  postInput,
  reportInput,
  threadInput,
} from "@/domain/community";
import { communityAuth, requireCommunityUser } from "~/infrastructure/auth/community";
import { HttpError } from "~/shared/http-error";
import { type ApiEnvironment, validate } from "../shared";

const app = new Hono<ApiEnvironment & { Variables: { userId: string } }>().basePath(
  "/api/community",
);

app.use("*", bodyLimit({ maxSize: 64 * 1024 }));
app.use("*", async (c, next) => {
  if (!["GET", "HEAD"].includes(c.req.method)) {
    if (!c.env.BETTER_AUTH_URL || c.req.header("origin") !== new URL(c.env.BETTER_AUTH_URL).origin)
      throw new HttpError(403, "请求来源无效。");

    c.set("userId", (await requireCommunityUser(c.req.raw, c.env)).id);
  } else if (c.req.header("cookie") && c.env.BETTER_AUTH_SECRET && c.env.BETTER_AUTH_URL) {
    c.set(
      "userId",
      (await communityAuth(c.env).api.getSession({ headers: c.req.raw.headers }))?.user.id ?? "",
    );
  }

  await next();
});

export const communityRoutes = app
  .get("/anime/:slug/threads", validate("query", communityPageInput), async (c) =>
    c.json(await c.var.services.community.listThreads(c.req.param("slug"), c.req.valid("query"))),
  )
  .post("/anime/:slug/threads", validate("json", threadInput), async (c) =>
    c.json(
      await c.var.services.community.createThread(
        c.req.param("slug"),
        c.var.userId,
        c.req.valid("json"),
      ),
      201,
    ),
  )
  .get("/threads/:id", async (c) =>
    c.json(await c.var.services.community.getThread(c.req.param("id"), c.var.userId)),
  )
  .get(
    "/threads/:id/replies",
    validate("query", communityPageInput.pick({ cursor: true })),
    async (c) =>
      c.json(
        await c.var.services.community.listReplies(
          c.req.param("id"),
          c.req.valid("query").cursor,
          c.var.userId,
        ),
      ),
  )
  .post("/threads/:id/replies", validate("json", postInput), async (c) =>
    c.json(
      await c.var.services.community.reply(c.req.param("id"), c.var.userId, c.req.valid("json")),
      201,
    ),
  )
  .get(
    "/posts/:id/comments",
    validate("query", communityPageInput.pick({ cursor: true })),
    async (c) =>
      c.json(
        await c.var.services.community.listComments(
          c.req.param("id"),
          c.req.valid("query").cursor,
          c.var.userId,
        ),
      ),
  )
  .post("/posts/:id/comments", validate("json", postInput), async (c) =>
    c.json(
      await c.var.services.community.comment(c.req.param("id"), c.var.userId, c.req.valid("json")),
      201,
    ),
  )
  .patch("/posts/:id", validate("json", postInput.pick({ body: true })), async (c) =>
    c.json(
      await c.var.services.community.editPost(
        c.req.param("id"),
        c.var.userId,
        c.req.valid("json").body,
      ),
    ),
  )
  .put("/posts/:id/like", validate("json", likeInput), async (c) =>
    c.json(
      await c.var.services.community.setLike(
        c.req.param("id"),
        c.var.userId,
        c.req.valid("json").liked,
      ),
    ),
  )
  .post("/posts/:id/reports", validate("json", reportInput), async (c) =>
    c.json(
      await c.var.services.community.reportPost(
        c.req.param("id"),
        c.var.userId,
        c.req.valid("json").reason,
      ),
    ),
  )
  .get("/me", async (c) =>
    c.json(
      await c.var.services.community.myActivity((await requireCommunityUser(c.req.raw, c.env)).id),
    ),
  );

export const communityAdminRoutes = new Hono<ApiEnvironment>()
  .basePath("/api/admin/community")
  .get("/", async (c) => c.json(await c.var.services.community.moderationQueue()))
  .patch("/:id", validate("json", moderationInput), async (c) =>
    c.json(await c.var.services.community.moderate(c.req.param("id"), c.req.valid("json"))),
  );
