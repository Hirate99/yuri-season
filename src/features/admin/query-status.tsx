import { LoadingRows } from "@/components/empty-state";
import type { UseQueryResult } from "@tanstack/react-query";

export function QueryStatus({
  query,
}: {
  query: Pick<UseQueryResult, "isPending" | "isRefetching" | "error" | "refetch">;
}) {
  return (
    <>
      {query.isPending && <LoadingRows count={3} />}
      {query.isRefetching && (
        <p className="mb-3 text-xs text-muted" role="status">
          正在更新…
        </p>
      )}
      {query.error && (
        <p className="mb-3 text-sm text-[#8b3048]" role="alert">
          {query.error.message} <button onClick={() => void query.refetch()}>重试</button>
        </p>
      )}
    </>
  );
}
