import { useCallback, useEffect, useState, type DependencyList } from "react";

export { apiClient, createApiClient, rpcData } from "./rpc";

type ApiState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, dependencies: DependencyList) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true });
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, error: null, loading: true }));
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ data: null, error: error instanceof Error ? error.message : String(error), loading: false });
        }
      });
    return () => controller.abort();
    // Callers explicitly declare the values captured by their RPC request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, version]);

  return { ...state, reload };
}
