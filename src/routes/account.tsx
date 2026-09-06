import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { authClient, authResult } from "@/features/community/auth-client";
import { CommunityFrame, field, FormError, PostTime } from "@/features/community/shared";
import { apiClient, rpcData } from "@/lib/rpc";
import { Button, UserAvatar } from "@/features/community/controls";

export const Route = createFileRoute("/account")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({ returnTo: typeof search.returnTo === "string" && /^\/(?!\/)/.test(search.returnTo) && !/[\\\s]/.test(search.returnTo) ? search.returnTo : undefined }),
  head: () => ({ meta: [{ title: "我的账号 · YuriSeason" }, { name: "robots", content: "noindex" }] }),
  component: Account,
});
function Account() {
  const { data: session, isPending, error } = authClient.useSession();
  const { returnTo } = Route.useSearch();
  return <CommunityFrame><div className={session ? "" : "mx-auto max-w-sm py-6 md:py-12"}><h1 className="mb-8 text-2xl font-bold">{session ? "我的账号" : "登录"}</h1>{session ? <Profile user={session.user} /> : <><FormError error={error} /><LoginForm returnTo={returnTo} checkingSession={isPending} /></>}</div></CommunityFrame>;
}
const pendingLoginKey = "yuri:pending-email-login";
const pendingLoginSchema = z.object({ email: z.email(), sentAt: z.number().finite() });
type PendingLogin = z.infer<typeof pendingLoginSchema>;
function readPendingLogin(): PendingLogin | null {
  try {
    const value = pendingLoginSchema.parse(JSON.parse(sessionStorage.getItem(pendingLoginKey) || "null"));
    const age = Date.now() - value.sentAt;
    if (age >= 0 && age < 300_000) return value;
  } catch { /* Storage may be unavailable. */ }
  storePendingLogin(null);
  return null;
}
function storePendingLogin(value: PendingLogin | null) {
  try {
    if (value) sessionStorage.setItem(pendingLoginKey, JSON.stringify(value));
    else sessionStorage.removeItem(pendingLoginKey);
  } catch { /* Login still works without persistence. */ }
}
function LoginForm({ returnTo, checkingSession }: { returnTo?: string; checkingSession: boolean }) {
  const [pending, setPending] = useState(readPendingLogin);
  const [now, setNow] = useState(Date.now);
  const sent = pending !== null;
  const retryIn = pending ? Math.max(0, Math.ceil((pending.sentAt + 60_000 - now) / 1000)) : 0;
  useEffect(() => {
    if (!retryIn) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryIn > 0]);
  const { register, handleSubmit, getValues, resetField, formState: { errors } } = useForm({ defaultValues: { email: pending?.email || "", otp: "", name: "" } });
  async function sendCode(email: string) {
    email = email.trim();
    await authResult(authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }));
    const value = { email, sentAt: Date.now() };
    storePendingLogin(value);
    setPending(value);
    setNow(value.sentAt);
    resetField("otp");
  }
  const action = useMutation({
    mutationFn: async (values: { email: string; otp: string; name: string }) => {
      if (!sent) await sendCode(values.email);
      else { await authResult(authClient.signIn.emailOtp({ ...values, email: pending.email, name: values.name.trim() || "新来的同好" })); storePendingLogin(null); if (returnTo) window.location.assign(returnTo); }
    },
  });
  const resend = useMutation({ mutationFn: () => sendCode(getValues("email")) });
  return <form noValidate onSubmit={handleSubmit((values) => action.mutate(values))} className="space-y-5">
    <label className="block text-sm">邮箱<input className={field} type="email" required autoComplete="email" readOnly={sent} {...register("email", { validate: (value) => z.email().safeParse(value.trim()).success || "请输入有效的邮箱地址。" })} /></label>
    {sent && <><p className="text-sm text-muted">验证码已发送，5 分钟内有效。</p><label className="block text-sm">6 位验证码<input className={field} required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} {...register("otp", { validate: (value) => !sent || /^\d{6}$/.test(value) || "请输入 6 位数字验证码。" })} /></label><label className="block text-sm">昵称 <span className="text-muted">（新账号选填）</span><input className={field} maxLength={32} autoComplete="nickname" {...register("name")} /></label></>}
    <FormError error={Object.values(errors)[0] || action.error || resend.error} />
    <Button type="submit" className="w-full" disabled={checkingSession || action.isPending || resend.isPending}>{action.isPending ? "请稍候…" : sent ? "登录" : "发送验证码"}</Button>
    {sent && <div className="flex gap-4 text-xs"><button type="button" disabled={checkingSession || action.isPending || resend.isPending || retryIn > 0} onClick={() => { action.reset(); resend.mutate(); }}>{retryIn > 0 ? `${retryIn} 秒后重发` : "重新发送"}</button><button type="button" disabled={action.isPending || resend.isPending} onClick={() => { storePendingLogin(null); setPending(null); resetField("otp"); action.reset(); resend.reset(); }}>更换邮箱</button>{resend.isSuccess && <span role="status">已重新发送</span>}</div>}
  </form>;
}
function Profile({ user }: { user: { id: string; name: string; email: string; banned?: boolean | null } }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { name: user.name } });
  const save = useMutation({ mutationFn: ({ name }: { name: string }) => authResult(authClient.updateUser({ name })), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["community"] }); } });
  const logout = useMutation({ mutationFn: () => authResult(authClient.signOut()), onSuccess: () => { queryClient.clear(); } });
  const activity = useQuery({ queryKey: ["community", "me", user.id], queryFn: () => rpcData(apiClient.api.community.me.$get()), enabled: !user.banned });
  return <div className="space-y-8"><form noValidate className="surface space-y-4 p-6" onSubmit={handleSubmit((value) => save.mutate(value))}><div className="flex items-center gap-4"><UserAvatar name={user.name} className="!size-14" /><p className="text-sm text-muted break-all">{user.email}</p></div>{user.banned && <p className="text-sm text-rose-700">账号已被禁言，暂时无法发帖或回复。</p>}<label className="block max-w-sm text-sm">昵称<input className={field} required maxLength={32} {...register("name", { validate: (value) => Boolean(value.trim()) || "请填写昵称。" })} /></label><FormError error={errors.name || save.error || logout.error} /><div className="flex gap-3"><Button type="submit" disabled={save.isPending}>保存资料</Button><Button tone="secondary" type="button" disabled={logout.isPending} onClick={() => logout.mutate()}>退出登录</Button>{save.isSuccess && <span role="status" className="self-center text-sm text-green-700">已保存</span>}</div></form>
    <section><h2 className="mb-4 text-xl font-semibold">最近参与的讨论</h2><FormError error={activity.error} /><div className="divide-y divide-line">{activity.data?.map((post) => <div className="flex items-center justify-between gap-4 py-4 text-sm" key={post.id}>{post.threadHidden ? <span className="text-muted">讨论已隐藏</span> : <Link to="/discussions/$id" params={{ id: post.threadId }} className="min-w-0 break-words hover:text-accent">{post.title}{post.hidden && " · 内容已隐藏"}</Link>}<span className="shrink-0 text-xs text-muted"><PostTime value={post.createdAt} /></span></div>)}</div>{activity.data?.length === 0 && <p className="text-sm text-muted">暂无讨论记录。</p>}<p className="mt-4 text-xs text-muted">显示最近 50 条发言。</p></section></div>;
}
