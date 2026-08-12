import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, FeedResponse } from "@/domain";
import { apiRequest } from "@/lib/api";

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

function endpointWithCursor(endpoint: string, cursor: string | null) {
  if (!cursor) return endpoint;
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}cursor=${encodeURIComponent(cursor)}`;
}

function appendUnique(current: FeedItem[], incoming: FeedItem[]) {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !known.has(item.id))];
}

export function useCursorFeed(endpoint: string, initialPage?: FeedResponse) {
  const initialEndpoint = useRef(endpoint);
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
    if (!initialConsumed.current && initialPage && endpoint === initialEndpoint.current) {
      initialConsumed.current = true;
      return;
    }
    initialConsumed.current = true;
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    setState(initialState);
    apiRequest<FeedResponse>(endpoint, { signal: controller.signal })
      .then((page) => {
        if (requestGeneration.current !== generation) return;
        setState({ items: page.items, nextCursor: page.nextCursor, error: null, loading: false, loadingMore: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestGeneration.current !== generation) return;
        setState({ items: [], nextCursor: null, error: error instanceof Error ? error.message : String(error), loading: false, loadingMore: false });
      });
    return () => controller.abort();
  }, [endpoint, initialPage]);

  const loadMore = useCallback(() => {
    if (!state.nextCursor || state.loading || state.loadingMore) return;
    const generation = requestGeneration.current;
    const cursor = state.nextCursor;
    setState((current) => ({ ...current, loadingMore: true, error: null }));
    apiRequest<FeedResponse>(endpointWithCursor(endpoint, cursor))
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
  }, [endpoint, state.loading, state.loadingMore, state.nextCursor]);

  return { ...state, loadMore };
}
