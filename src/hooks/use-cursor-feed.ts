import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, FeedResponse } from "@/domain";
import { apiClient, rpcData } from "@/lib/api";

type CursorFeedState = {
  items: FeedItem[];
  nextCursor: string | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
};

const initialState: CursorFeedState = {
  items: [],
  nextCursor: null,
  error: null,
  loading: true,
  refreshing: false,
  loadingMore: false,
};

export type FeedQuery = {
  limit: string;
  q?: string;
  anime?: string;
  classes?: string;
};

function loadFeed(query: FeedQuery, cursor?: string, signal?: AbortSignal) {
  return rpcData(apiClient.api.feed.$get(
    { query: { ...query, cursor } },
    { init: { signal } },
  ));
}

function appendUnique(current: FeedItem[], incoming: FeedItem[]) {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !known.has(item.id))];
}

export function useCursorFeed(query: FeedQuery, initialPage?: FeedResponse) {
  const queryKey = JSON.stringify(query);
  const loadedQueryKey = useRef<string | null>(initialPage ? queryKey : null);
  const [state, setState] = useState<CursorFeedState>(() => initialPage ? {
    items: initialPage.items,
    nextCursor: initialPage.nextCursor,
    error: null,
    loading: false,
    refreshing: false,
    loadingMore: false,
  } : initialState);
  const requestGeneration = useRef(0);

  useEffect(() => {
    // The server-rendered page already satisfies the initial query. Keep that
    // relationship explicit so React's development effect replay cannot clear
    // the hydrated items and briefly replace them with loading rows.
    if (loadedQueryKey.current === queryKey) return;

    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    const refreshing = loadedQueryKey.current !== null;
    setState((current) => ({
      ...current,
      error: null,
      loading: !refreshing,
      refreshing,
      loadingMore: false,
    }));
    loadFeed(query, undefined, controller.signal)
      .then((page) => {
        if (requestGeneration.current !== generation) return;
        loadedQueryKey.current = queryKey;
        setState({ items: page.items, nextCursor: page.nextCursor, error: null, loading: false, refreshing: false, loadingMore: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestGeneration.current !== generation) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : String(error),
          loading: false,
          refreshing: false,
          loadingMore: false,
        }));
      });
    return () => controller.abort();
  }, [queryKey]);

  const loadMore = useCallback(() => {
    if (!state.nextCursor || state.loading || state.refreshing || state.loadingMore) return;
    const generation = requestGeneration.current;
    const cursor = state.nextCursor;
    setState((current) => ({ ...current, loadingMore: true, error: null }));
    loadFeed(query, cursor)
      .then((page) => {
        if (requestGeneration.current !== generation) return;
        setState((current) => ({
          ...current,
          items: appendUnique(current.items, page.items),
          nextCursor: page.nextCursor,
          loadingMore: false,
        }));
      })
      .catch((error: unknown) => {
        if (requestGeneration.current !== generation) return;
        setState((current) => ({ ...current, error: error instanceof Error ? error.message : String(error), loadingMore: false }));
      });
  }, [queryKey, state.loading, state.refreshing, state.loadingMore, state.nextCursor]);

  return { ...state, loadMore };
}
