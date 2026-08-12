import {
  createLocalJWKSet,
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";

import { HttpError } from "../http";

type AccessJsonWebKey = JsonWebKey & { kid?: string };

export type AccessIdentity = {
  email: string;
  subject: string | null;
};

function normalizeTeamDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function allowedEmails(value: string): Set<string> {
  return new Set(value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function verifyAccessJwt(
  token: string,
  config: { teamDomain: string; audience: string; adminEmails: string },
  keys?: AccessJsonWebKey[],
): Promise<AccessIdentity> {
  const teamDomain = normalizeTeamDomain(config.teamDomain);
  const issuer = `https://${teamDomain}`;
  const keySet = keys
    ? createLocalJWKSet({ keys: keys as unknown as JSONWebKeySet["keys"] })
    : createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySet, {
      algorithms: ["RS256"],
      audience: config.audience,
      issuer,
      requiredClaims: ["exp", "email"],
    }));
  } catch (error) {
    if (error instanceof errors.JWKSTimeout || !(error instanceof errors.JOSEError)) {
      throw new HttpError(503, "暂时无法核验 Access 身份。");
    }
    throw new HttpError(401, "Access 身份凭证无效或已过期。");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || !allowedEmails(config.adminEmails).has(email)) {
    throw new HttpError(403, "该邮箱不在 Admin 白名单中。");
  }

  return { email, subject: typeof payload.sub === "string" ? payload.sub : null };
}
