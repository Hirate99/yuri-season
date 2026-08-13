import { createAdminService } from "./admin/service";
import { createPublicService } from "./public/service";
import { createResearchService } from "./research/service";
import type { AdminPrincipal } from "~/infrastructure/auth";

export function createRequestServices(env: Env, principal?: AdminPrincipal) {
  return {
    admin: createAdminService(env, principal),
    public: createPublicService(env),
    research: createResearchService(env),
  };
}

export type RequestServices = ReturnType<typeof createRequestServices>;
