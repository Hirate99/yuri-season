import { describe, expect, test } from "bun:test";
import { redirectPublicAdmin } from "@/server/admin-boundary";

const publicEnv = {
  DEPLOYMENT_ROLE: "public",
  ADMIN_ORIGIN: "https://i-yuri.com",
};

describe("Admin deployment boundary", () => {
  test("moves public Admin pages to the Access-protected Worker", () => {
    const response = redirectPublicAdmin(
      new Request("https://yuri-season-radar.mskyurina.workers.dev/admin/resources?anime=kimishinu"),
      publicEnv,
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location"))
      .toBe("https://i-yuri.com/admin/resources?anime=kimishinu");
  });

  test("leaves the public site and token-authenticated Admin API on the public Worker", () => {
    expect(redirectPublicAdmin(new Request("https://example.com/feed"), publicEnv)).toBeNull();
    expect(redirectPublicAdmin(new Request("https://example.com/api/admin/batches"), publicEnv)).toBeNull();
    expect(redirectPublicAdmin(new Request("https://example.com/administrator"), publicEnv)).toBeNull();
  });

  test("does not loop inside the Admin deployment", () => {
    expect(redirectPublicAdmin(
      new Request("https://yuri-season-radar-admin.mskyurina.workers.dev/admin"),
      { ...publicEnv, DEPLOYMENT_ROLE: "admin" },
    )).toBeNull();
  });

  test("ignores an unsafe or malformed configured origin", () => {
    const request = new Request("https://example.com/admin");
    expect(redirectPublicAdmin(request, { DEPLOYMENT_ROLE: "public", ADMIN_ORIGIN: "not a URL" })).toBeNull();
    expect(redirectPublicAdmin(request, { DEPLOYMENT_ROLE: "public", ADMIN_ORIGIN: "http://example.com" })).toBeNull();
  });
});
