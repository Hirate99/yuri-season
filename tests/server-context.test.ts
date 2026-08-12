import { describe, expect, test } from "bun:test";
import { viewerTimeZoneFromRequest } from "@/server-context";

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
