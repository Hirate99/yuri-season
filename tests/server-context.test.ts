import { describe, expect, test } from "bun:test";
import { publicApiOriginFromRequest, viewerTimeZoneFromRequest } from "@/server-context";

function requestWithTimeZone(timeZone?: unknown): Request {
  const request = new Request("https://example.com/");
  if (timeZone !== undefined) {
    Object.defineProperty(request, "cf", { value: { timezone: timeZone } });
  }
  return request;
}

describe("SSR viewer timezone", () => {
  test("uses the Cloudflare visitor timezone", () => {
    expect(viewerTimeZoneFromRequest(requestWithTimeZone("America/Los_Angeles")))
      .toBe("America/Los_Angeles");
  });

  test("falls back when geolocation is unavailable", () => {
    expect(viewerTimeZoneFromRequest(requestWithTimeZone())).toBe("Asia/Tokyo");
  });

  test("rejects invalid request metadata", () => {
    expect(viewerTimeZoneFromRequest(requestWithTimeZone("not/a-time-zone"))).toBe("Asia/Tokyo");
    expect(viewerTimeZoneFromRequest(requestWithTimeZone(123))).toBe("Asia/Tokyo");
  });
});

describe("Whistle production-data development mode", () => {
  test("uses the fixed public production origin only in development", () => {
    const request = new Request("http://127.0.0.1:3000/", {
      headers: { "x-yuri-production-data": "1" },
    });
    expect(publicApiOriginFromRequest(request, true)).toBe("https://i-yuri.com");
    expect(publicApiOriginFromRequest(request, false)).toBeUndefined();
  });

  test("keeps ordinary local development on local D1", () => {
    expect(publicApiOriginFromRequest(new Request("http://127.0.0.1:3000/"), true)).toBeUndefined();
  });
});
