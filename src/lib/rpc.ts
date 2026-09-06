import { DetailedError, hc, parseResponse, type ClientResponse } from "hono/client";

import type { ApiType } from "~/http/api";

export function createApiClient(baseUrl = "/", headers?: HeadersInit) {
  const headerRecord = headers ? Object.fromEntries(new Headers(headers)) : undefined;

  return hc<ApiType>(baseUrl, headerRecord ? { headers: headerRecord } : undefined);
}

/** The client is derived from the Hono route tree; paths and payloads are not duplicated. */
export const apiClient = createApiClient();

export async function rpcData<T extends ClientResponse<unknown>>(request: T | Promise<T>) {
  try {
    return await parseResponse(request);
  } catch (error) {
    if (error instanceof DetailedError) {
      const message = error.detail?.data?.message;
      if (typeof message === "string") throw new Error(message);
    }

    throw error;
  }
}
