import { betterAuth } from "better-auth/minimal";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { database } from "~/infrastructure/db/client";
import { authAccounts, authRateLimits, authSessions, authUsers, authVerifications } from "~/infrastructure/db/schema/community";
import { HttpError } from "~/shared/http-error";

export function communityAuth(env: Env) {
  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) throw new HttpError(503, "用户登录暂未开放。");
  // One auth instance per request; Better Auth otherwise swallows delivery failures.
  let emailSendFailed = false;
  return betterAuth({
    appName: "YuriSeason",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
    database: drizzleAdapter(database(env.DB), {
      provider: "sqlite", transaction: false,
      schema: { user: authUsers, session: authSessions, account: authAccounts, verification: authVerifications, rateLimit: authRateLimits },
    }),
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { disableOriginCheck: false, disableCSRFCheck: false, ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    hooks: { after: createAuthMiddleware(async () => {
      if (emailSendFailed) throw new APIError("SERVICE_UNAVAILABLE", { message: "验证码邮件暂时无法发送，请稍后再试。" });
    }) },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    user: { additionalFields: { banned: { type: "boolean", defaultValue: false, input: false } } },
    databaseHooks: {
      user: {
        create: { before: async (user) => ({ data: { ...user, image: null, name: user.name.trim().slice(0, 32) || "新来的同好" } }) },
        update: { before: async (user) => {
          if (user.image !== undefined) throw new APIError("FORBIDDEN", { message: "头像上传暂未开放。" });
          if (user.name !== undefined && (!user.name.trim() || user.name.trim().length > 32)) {
            throw new APIError("BAD_REQUEST", { message: "昵称请填写 1～32 个字符。" });
          }
          return { data: { ...user, ...(user.name !== undefined ? { name: user.name.trim() } : {}) } };
        } },
      },
    },
    plugins: [emailOTP({
      otpLength: 6, expiresIn: 300, allowedAttempts: 3, storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp }) {
        if (!env.EMAIL || !env.AUTH_EMAIL_FROM) { emailSendFailed = true; return; }
        await env.EMAIL.send({
          from: { email: env.AUTH_EMAIL_FROM, name: "YuriSeason" }, to: email,
          subject: `${otp} · YuriSeason 登录验证码`,
          text: `你的 YuriSeason 验证码是 ${otp}，5 分钟内有效。\n\n请勿向他人透露验证码。如果不是你本人操作，请忽略这封邮件。`,
        }).catch(() => { emailSendFailed = true; console.error(JSON.stringify({ event: "auth_email_send_failed" })); });
      },
    })],
  });
}

export async function requireCommunityUser(request: Request, env: Env) {
  const session = await communityAuth(env).api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) throw new HttpError(401, "请先登录后再参与讨论。");
  if (session.user.banned) throw new HttpError(403, "账号已被禁言。");
  return session.user;
}
