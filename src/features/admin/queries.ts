import type {
  AdminResourceWrite,
  AnimeCreate,
  AnimePatch,
  ReviewDecision,
  SeasonWrite,
} from "@/domain";
import { apiClient, rpcData } from "@/lib/rpc";
import { mutationOptions, queryOptions } from "@tanstack/react-query";

export const resourcesQuery = (animeId: string) =>
  queryOptions({
    queryKey: ["admin", "resources", animeId],
    queryFn: ({ signal }) =>
      rpcData(
        apiClient.api.admin.anime[":id"].resources.$get(
          { param: { id: animeId } },
          { init: { signal } },
        ),
      ),
  });

export const memoryQuery = queryOptions({
  queryKey: ["admin", "memory"],
  queryFn: ({ signal }) =>
    rpcData(apiClient.api.admin.research.memory.$get({}, { init: { signal } })),
});

export const summaryQuery = queryOptions({
  queryKey: ["admin", "summary"],
  queryFn: ({ signal }) => rpcData(apiClient.api.admin.summary.$get({}, { init: { signal } })),
});

export const overviewQuery = queryOptions({
  queryKey: ["admin", "overview"],
  queryFn: ({ signal }) => rpcData(apiClient.api.admin.overview.$get({}, { init: { signal } })),
});

export const worksQuery = queryOptions({
  queryKey: ["admin", "works"],
  queryFn: ({ signal }) => rpcData(apiClient.api.admin.works.$get({}, { init: { signal } })),
});

export const reviewQuery = queryOptions({
  queryKey: ["admin", "review"],
  queryFn: ({ signal }) => rpcData(apiClient.api.admin.review.$get({}, { init: { signal } })),
});

export const automationQuery = queryOptions({
  queryKey: ["admin", "automation"],
  queryFn: ({ signal }) => rpcData(apiClient.api.admin.automation.$get({}, { init: { signal } })),
});

export const coverageQuery = queryOptions({
  queryKey: ["admin", "coverage"],
  queryFn: ({ signal }) => rpcData(apiClient.api.admin.coverage.$get({}, { init: { signal } })),
});

// Invalidate the related pages, including inactive caches, after a successful write.
const refreshAdmin = (
  _data: unknown,
  _variables: unknown,
  _result: unknown,
  { client }: { client: import("@tanstack/react-query").QueryClient },
) => client.invalidateQueries({ queryKey: ["admin"] });

export const saveResourceMutation = (animeId: string, id?: string) =>
  mutationOptions({
    mutationFn: async (input: AdminResourceWrite) =>
      id
        ? rpcData(
            apiClient.api.admin.anime[":animeId"].resources[":kind"][":id"].$patch({
              param: { animeId, kind: input.kind, id },
              json: input.value,
            }),
          )
        : rpcData(
            apiClient.api.admin.anime[":id"].resources.$post({
              param: { id: animeId },
              json: input,
            }),
          ),
    onSuccess: refreshAdmin,
  });

export const deleteResourceMutation = (animeId: string) =>
  mutationOptions({
    mutationFn: ({
      kind,
      id,
    }: {
      kind: Exclude<AdminResourceWrite["kind"], "source">;
      id: string;
    }) =>
      rpcData(
        apiClient.api.admin.anime[":animeId"].resources[":kind"][":id"].$delete({
          param: { animeId, kind, id },
        }),
      ),
    onSuccess: refreshAdmin,
  });

export const deleteDiscussionMutation = mutationOptions({
  mutationFn: ({ id, reason }: { id: string; reason: string }) =>
    rpcData(apiClient.api.admin.discussions[":id"].$delete({ param: { id }, json: { reason } })),
  onSuccess: refreshAdmin,
});

export const createWorkMutation = mutationOptions({
  mutationFn: (value: AnimeCreate) => rpcData(apiClient.api.admin.anime.$post({ json: value })),
  onSuccess: refreshAdmin,
});

export const patchWorkMutation = (id: string) =>
  mutationOptions({
    mutationFn: (value: AnimePatch) =>
      rpcData(apiClient.api.admin.anime[":id"].$patch({ param: { id }, json: value })),
    onSuccess: refreshAdmin,
  });

export const decisionMutation = mutationOptions({
  mutationFn: ({
    id,
    decision,
    reason = "",
  }: {
    id: string;
    decision: ReviewDecision;
    reason?: string;
  }) =>
    rpcData(
      apiClient.api.admin.candidates[":id"].decision.$post({
        param: { id },
        json: { decision, reason },
      }),
    ),
  onSuccess: refreshAdmin,
});

export const saveSeasonMutation = (id?: string) =>
  mutationOptions({
    mutationFn: async (value: SeasonWrite) =>
      id
        ? rpcData(apiClient.api.admin.seasons[":id"].$patch({ param: { id }, json: value }))
        : rpcData(apiClient.api.admin.seasons.$post({ json: value })),
    onSuccess: refreshAdmin,
  });
