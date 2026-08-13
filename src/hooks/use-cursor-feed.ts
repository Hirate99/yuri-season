import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, FeedResponse } from "@/domain";
import { apiClient, rpcData } from "@/lib/api";

type CursorFeedState = {
  items: FeedItem[];
  nextCursor: string | null;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
};

const initialState: CursorFeedState = {
  items: [],
  nextCursor: null,
  error: null,
  loading: true,
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
  const initialQueryKey = useRef(queryKey);
  const initialConsumed = useRef(false);
  const [state, setState] = useState<CursorFeedState>(() => initialPage ? {
    items: initialPage.items,
    nextCursor: initialPage.nextCursor,
    error: null,
    loading: false,
    loadingMore: false,
  } : initialState);
  const requestGeneration = useRef(0);

  useEffect(() => {
    if (!initialConsumed.current && initialPage && queryKey === initialQueryKey.current) {
      initialConsumed.current = true;
      return;
    }
    initialConsumed.current = true;
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    setState(initialState);
    loadFeed(query, undefined, controller.signal)
      .then((page) => {
        if (requestGeneration.current !== generation) return;
        setState({ items: page.items, nextCursor: page.nextCursor, error: null, loading: false, loadingMore: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestGeneration.current !== generation) return;
        setState({ items: [], nextCursor: null, error: error instanceof Error ? error.message : String(error), loading: false, loadingMore: false });
      });
    return () => controller.abort();
  }, [queryKey, initialPage]);

  const loadMore = useCallback(() => {
    if (!state.nextCursor || state.loading || state.loadingMore) return;
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
  }, [queryKey, state.loading, state.loadingMore, state.nextCursor]);

  return { ...state, loadMore };
}
