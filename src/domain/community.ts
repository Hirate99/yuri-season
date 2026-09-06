import { z } from "zod";

export const postInput = z.object({
  body: z.string().trim().min(1, "请填写正文。").max(10_000, "正文最多 10000 字。"),
  replyToId: z.string().max(120).nullable().optional(),
});

export const threadInput = postInput.omit({ replyToId: true }).extend({
  title: z.string().trim().min(1, "请填写标题。").max(120, "标题最多 120 字。"),
  episode: z.number().int().min(1).max(999).nullable().default(null),
  spoiler: z.boolean().default(false),
});

export const likeInput = z.object({ liked: z.boolean() });

export const reportInput = z.object({
  reason: z.string().trim().min(1, "请说明举报原因。").max(500),
});

export const communityPageInput = z.object({
  cursor: z.string().max(500).optional(),
  order: z.enum(["active", "new"]).default("active"),
  episode: z.coerce.number().int().min(1).max(999).optional(),
});

export const moderationInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("thread"),
    pinned: z.boolean().optional(),
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("post"), hidden: z.boolean() }),
  z.object({ kind: z.literal("user"), banned: z.boolean() }),
  z.object({ kind: z.literal("report"), resolved: z.boolean() }),
]);
