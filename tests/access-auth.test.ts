import { describe, expect, spyOn, test } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { requireAdmin } from "~/infrastructure/auth";
import { verifyAccessJwt } from "~/infrastructure/auth/access";

const config = {
  teamDomain: "example.cloudflareaccess.com",
  audience: "admin-audience",
  adminEmails: "haonan.su@outlook.com, second@example.com",
};

async function fixture(overrides: Record<string, unknown> = {}) {
  const pair = await generateKeyPair("RS256");
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    iss: "https://example.cloudflareaccess.com",
    aud: "admin-audience",
    email: "haonan.su@outlook.com",
    sub: "user-1",
    nbf: now - 10,
    exp: now + 300,
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .sign(pair.privateKey);
  return { token, keys: [{ ...(await exportJWK(pair.publicKey)), kid: "test-key" }] };
}

describe("Cloudflare Access identity", () => {
  test("accepts signed tokens and reuses jose's remote key cache", async () => {
    const { token, keys } = await fixture();
    const fetchKeys = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ keys }));
    try {
      for (let index = 0; index < 2; index += 1) {
        await expect(verifyAccessJwt(token, config)).resolves.toEqual({
          email: "haonan.su@outlook.com",
          subject: "user-1",
        });
      }
      expect(fetchKeys).toHaveBeenCalledTimes(1);
    } finally {
      fetchKeys.mockRestore();
    }
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
    await expect(
      requireAdmin(request, { ADMIN_TOKEN: "local-agent-secret" } as Env),
    ).resolves.toEqual({
      kind: "automation",
      subject: "admin-token",
    });
  });

  test("rejects an invalid automation token without falling through to Access", async () => {
    const request = new Request("https://example.com/api/admin/dashboard", {
      headers: {
        authorization: "Bearer wrong",
        "cf-access-jwt-assertion": "service-token-assertion",
      },
    });
    await expect(
      requireAdmin(request, { ADMIN_TOKEN: "local-agent-secret" } as Env),
    ).rejects.toMatchObject({ status: 401 });
  });
});
