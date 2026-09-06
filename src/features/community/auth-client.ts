import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [emailOTPClient(), inferAdditionalFields({
  user: { banned: { type: "boolean", input: false } },
})] });

export async function authResult<T extends { error: { message?: string } | null }>(result: Promise<T>) {
  const response = await result;
  if (response.error) throw new Error(response.error.message || "操作失败，请稍后重试。");
  return response;
}
