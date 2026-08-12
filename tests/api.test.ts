import { describe, expect, test } from "bun:test";

import { api } from "../src/server/api";

describe("Hono API boundary", () => {
  test("serves health JSON with no-store caching", async () => {
    const response = await api.request("https://example.test/api/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true });
  });

  test("returns a JSON 404 for unknown API paths", async () => {
    const response = await api.request("https://example.test/api/unknown");
    expect(response.status).toBe(404);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: "not_found", message: "没有找到这个 API。" });
  });

  test("keeps method-not-allowed behavior without per-route fallbacks", async () => {
    const response = await api.request("https://example.test/api/health", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });

  test("protects all Admin endpoints with one middleware", async () => {
    const response = await api.request("https://example.test/api/admin/dashboard", undefined, {} as Env);
    expect(response.status).toBe(401);
  });

  test("validates JSON content type before repository work", async () => {
    const response = await api.request("https://example.test/api/admin/anime", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "text/plain" },
      body: "{}",
    }, { ADMIN_TOKEN: "test-secret" } as Env);
    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ error: "request_failed" });
  });

  test("maps Zod failures to the shared request error shape", async () => {
    const response = await api.request("https://example.test/api/admin/anime", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
      body: "{}",
    }, { ADMIN_TOKEN: "test-secret" } as Env);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "request_failed" });
  });
});
