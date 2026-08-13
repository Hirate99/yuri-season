import { createAdminService } from "./admin/service";
import { createPublicService } from "./public/service";
import { createResearchService } from "./research/service";

export function createRequestServices(env: Env) {
  return {
    admin: createAdminService(env),
    public: createPublicService(env),
    research: createResearchService(env),
  };
}

export type RequestServices = ReturnType<typeof createRequestServices>;
