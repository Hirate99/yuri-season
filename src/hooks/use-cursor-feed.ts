import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedResponse } from "@/domain";
import { apiClient, rpcData } from "@/lib/api";
import type { feedQuery } from "@/lib/feed-search";

// The caller keys the list by its filters; this hook only appends pages.
export function useCursorFeed(query: ReturnType<typeof feedQuery>, initialPage: FeedResponse) {
  const [state, setState] = useState(() => ({ ...initialPage, error: null as string | null, loadingMore: false }));
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  const loadMore = useCallback(() => {
    if (!state.nextCursor || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState((value) => ({ ...value, loadingMore: true, error: null }));
    rpcData(apiClient.api.feed.$get(
      { query: { ...query, cursor: state.nextCursor } },
      { init: { signal: controller.signal } },
    )).then((page) => {
      if (controller.signal.aborted) return;
      setState((value) => {
        const known = new Set(value.items.map((item) => item.id));
        return { ...value, items: [...value.items, ...page.items.filter((item) => !known.has(item.id))],
          nextCursor: page.nextCursor, loadingMore: false };
      });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((value) => ({
        ...value, error: error instanceof Error ? error.message : String(error), loadingMore: false,
      }));
    }).finally(() => {
      if (request.current === controller) request.current = null;
    });
  }, [query, state.nextCursor]);

  return { ...state, loadMore };
}
