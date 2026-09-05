import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export { apiClient, createApiClient, rpcData } from "./rpc";

type ApiState<T> = {
  data: T | null;
  error: string | null;
  pending: boolean;
};

export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, dependencies: DependencyList) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, pending: true });
  const previousDependencies = useRef(dependencies);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const changed = dependencies.length !== previousDependencies.current.length
      || dependencies.some((value, index) => !Object.is(value, previousDependencies.current[index]));
    previousDependencies.current = dependencies;
    setState((current) => ({
      data: changed ? null : current.data,
      error: null,
      pending: true,
    }));
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, pending: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState((current) => ({ ...current, error: error instanceof Error ? error.message : String(error), pending: false }));
        }
      });
    return () => controller.abort();
    // Callers explicitly declare the values captured by their RPC request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, version]);

  return { data: state.data, error: state.error, reload,
    loading: state.pending && state.data === null,
    refreshing: state.pending && state.data !== null };
}
