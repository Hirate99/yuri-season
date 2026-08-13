import { describe, expect, test } from "bun:test";
import { requireAdmin } from "~/infrastructure/auth";
import { verifyAccessJwt } from "~/infrastructure/auth/access";

const config = {
  teamDomain: "example.cloudflareaccess.com",
  audience: "admin-audience",
  adminEmails: "haonan.su@outlook.com, second@example.com",
};

function base64Url(value: ArrayBuffer | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function fixture(overrides: Record<string, unknown> = {}) {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", kid: "test-key" }));
  const payload = base64Url(JSON.stringify({
    iss: "https://example.cloudflareaccess.com",
    aud: "admin-audience",
    email: "haonan.su@outlook.com",
    sub: "user-1",
    nbf: now - 10,
    exp: now + 300,
    ...overrides,
  }));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  const key = await crypto.subtle.exportKey("jwk", pair.publicKey) as JsonWebKey & { kid?: string };
  key.kid = "test-key";
  return { token: `${header}.${payload}.${base64Url(signature)}`, keys: [key] };
}

describe("Cloudflare Access identity", () => {
  test("accepts a signed token for an allowlisted email", async () => {
    const { token, keys } = await fixture();
    await expect(verifyAccessJwt(token, config, keys)).resolves.toEqual({ email: "haonan.su@outlook.com", subject: "user-1" });
  });

  test("rejects an email outside the Worker allowlist", async () => {
    const { token, keys } = await fixture({ email: "other@example.com" });
    await expect(verifyAccessJwt(token, config, keys)).rejects.toMatchObject({ status: 403 });
  });

  test("rejects a token for a different Access application", async () => {
    const { token, keys } = await fixture({ aud: "different-audience" });
    await expect(verifyAccessJwt(token, config, keys)).rejects.toMatchObject({ status: 401 });
  });
});

describe("Admin automation identity", () => {
  test("uses the automation token when Access also injects a service assertion", async () => {
    const request = new Request("https://example.com/api/admin/dashboard", {
      headers: {
        authorization: "Bearer local-agent-secret",
        "cf-access-jwt-assertion": "service-token-assertion",
      },
    });
    await expect(requireAdmin(request, { ADMIN_TOKEN: "local-agent-secret" } as Env)).resolves.toBeUndefined();
  });

  test("rejects an invalid automation token without falling through to Access", async () => {
    const request = new Request("https://example.com/api/admin/dashboard", {
      headers: {
        authorization: "Bearer wrong",
        "cf-access-jwt-assertion": "service-token-assertion",
      },
    });
    await expect(requireAdmin(request, { ADMIN_TOKEN: "local-agent-secret" } as Env)).rejects.toMatchObject({ status: 401 });
  });
});
