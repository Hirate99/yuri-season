import { HttpError } from "~/shared/http-error";
import { verifyAccessJwt } from "./access";

export type AdminPrincipal = {
  kind: "access" | "automation";
  subject: string;
  email?: string;
};

const encoder = new TextEncoder();

async function digest(value: string): Promise<Uint8Array> {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));

  return new Uint8Array(result);
}

async function secretMatches(candidate: string, expected: string): Promise<boolean> {
  const [candidateHash, expectedHash] = await Promise.all([digest(candidate), digest(expected)]);
  let difference = 0;

  for (let index = 0; index < candidateHash.length; index += 1) {
    difference |= candidateHash[index] ^ expectedHash[index];
  }

  return difference === 0;
}

async function requireAccessIdentity(assertion: string, env: Env): Promise<AdminPrincipal> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAILS) {
    throw new HttpError(503, "尚未配置 Admin 邮箱身份验证。");
  }

  const identity = await verifyAccessJwt(assertion, {
    teamDomain: env.ACCESS_TEAM_DOMAIN,
    audience: env.ACCESS_AUD,
    adminEmails: env.ADMIN_EMAILS,
  });

  return {
    kind: "access",
    subject: identity.subject ?? identity.email,
    email: identity.email,
  };
}

async function requireAutomationToken(request: Request, env: Env): Promise<AdminPrincipal> {
  const authorization = request.headers.get("authorization") ?? "";
  const candidate = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!env.ADMIN_TOKEN || !candidate || !(await secretMatches(candidate, env.ADMIN_TOKEN))) {
    throw new HttpError(401, "Admin 身份验证失败。");
  }

  return { kind: "automation", subject: "admin-token" };
}

export async function requireAdmin(request: Request, env: Env): Promise<AdminPrincipal> {
  if ((request.headers.get("authorization") ?? "").startsWith("Bearer ")) {
    return requireAutomationToken(request, env);
  }

  const accessAssertion = request.headers.get("cf-access-jwt-assertion");

  if (accessAssertion) {
    return requireAccessIdentity(accessAssertion, env);
  }

  return requireAutomationToken(request, env);
}
