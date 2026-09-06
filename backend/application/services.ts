import { createAdminService } from "./admin/service";
import { createPublicService } from "./public/service";
import { createResearchService } from "./research/service";
import type { AdminPrincipal } from "~/infrastructure/auth";
import * as community from "~/repositories/community";

export function createRequestServices(env: Env, principal?: AdminPrincipal) {
  return {
    admin: createAdminService(env, principal),
    public: createPublicService(env),
    research: createResearchService(env),
    get community() { return {
      listThreads: community.listThreads.bind(null, env.DB),
      createThread: community.createThread.bind(null, env.DB),
      getThread: community.getThread.bind(null, env.DB),
      listReplies: community.listReplies.bind(null, env.DB),
      reply: community.reply.bind(null, env.DB),
      listComments: community.listComments.bind(null, env.DB),
      comment: community.comment.bind(null, env.DB),
      editPost: community.editPost.bind(null, env.DB),
      setLike: community.setLike.bind(null, env.DB),
      reportPost: community.reportPost.bind(null, env.DB),
      myActivity: community.myActivity.bind(null, env.DB),
      moderationQueue: community.moderationQueue.bind(null, env.DB),
      moderate: (id: string, input: Parameters<typeof community.moderate>[2]) => community.moderate(env.DB, id, input, principal),
    }; },
  };
}

export type RequestServices = ReturnType<typeof createRequestServices>;
