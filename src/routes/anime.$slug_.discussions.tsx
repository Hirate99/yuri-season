import { MarkdownEditor } from "@/features/community/markdown-editor";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Checkbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useState } from "react";
import { threadInput } from "@/domain/community";
import { authClient } from "@/features/community/auth-client";
import { Button, Choice, Pagination, UserAvatar } from "@/features/community/controls";
import { CommunityFrame, field, FormError, LoginPrompt, PostTime, ThreadBadges } from "@/features/community/shared";
import { apiClient, rpcData } from "@/lib/rpc";

export const Route = createFileRoute("/anime/$slug_/discussions")({ ssr: false, head: () => ({ meta: [{ title: "动画讨论 · YuriSeason" }, { name: "robots", content: "noindex" }] }), component: Board });
function Board() {
  const { slug } = Route.useParams();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [order, setOrder] = useState<"active" | "new">("active");
  const [episode, setEpisode] = useState("");
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState(0);
  const list = useInfiniteQuery({ queryKey: ["community", "threads", slug, order, episode], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => rpcData(apiClient.api.community.anime[":slug"].threads.$get({ param: { slug }, query: { order, ...(episode ? { episode } : {}), ...(pageParam ? { cursor: pageParam } : {}) } })),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const form = useForm<z.input<typeof threadInput>, unknown, z.output<typeof threadInput>>({ resolver: zodResolver(threadInput), defaultValues: { title: "", body: "", episode: null, spoiler: false } });
  const create = useMutation({ mutationFn: (json: z.output<typeof threadInput>) => rpcData(apiClient.api.community.anime[":slug"].threads.$post({ param: { slug }, json })), onSuccess: ({ id }) => { void queryClient.invalidateQueries({ queryKey: ["community"] }); void navigate({ to: "/discussions/$id", params: { id } }); } });
  const work = list.data?.pages[0].anime;
  return <CommunityFrame><Link to="/anime/$slug" params={{ slug }} className="text-xs font-semibold text-accent hover:underline">← {work?.title || "返回动画"}</Link><div className="mt-5 mb-7 flex items-center justify-between gap-4"><h1 className="text-3xl font-bold">讨论</h1>{session && !session.user.banned && <Button tone={composing ? "ghost" : "primary"} aria-expanded={composing} aria-controls="new-discussion" onClick={() => setComposing(!composing)}>{composing ? "收起" : "发起讨论"}</Button>}</div>
    {!isPending && !session && <LoginPrompt />}{session?.user.banned && <p className="text-sm text-rose-700">账号已被禁言，暂时无法发言。</p>}
    {composing && <form noValidate id="new-discussion" className="my-6 space-y-5" onSubmit={form.handleSubmit((value) => create.mutate(value))}>
      <label className="block text-xs font-semibold">标题<input className={`${field} !rounded-lg !py-2.5 font-normal`} maxLength={120} placeholder="输入标题，避免剧透" {...form.register("title")} /></label>
      <div><label htmlFor="discussion-body" className="block text-xs font-semibold">正文</label><MarkdownEditor id="discussion-body" className={`${field} block resize-none !rounded-lg !py-2.5 font-normal`} minRows={5} maxLength={10000} placeholder="输入正文，支持 Markdown" {...form.register("body")} value={form.watch("body")} /></div>
      <div className="grid items-center gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="inline-flex h-9 items-center gap-2 text-xs text-muted">话数<span className="sr-only">（选填）</span><input type="number" min={1} max={999} aria-label="关联话数（选填）" placeholder="选填" className="h-9 w-20 rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-ink outline-none placeholder:text-neutral-400 focus:border-accent/60" {...form.register("episode", { setValueAs: (value) => value === "" ? null : Number(value) })} /></label>
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted"><Controller name="spoiler" control={form.control} render={({ field: input }) => <Checkbox.Root name={input.name} checked={input.value} onCheckedChange={input.onChange} onBlur={input.onBlur} ref={input.ref} className="grid size-4 shrink-0 place-items-center rounded border border-neutral-300 bg-white text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/25 data-checked:border-accent data-checked:bg-accent"><Checkbox.Indicator><Check size={12} strokeWidth={2.5} /></Checkbox.Indicator></Checkbox.Root>} />含剧透</label>
        </div>
        <Button type="submit" className="!min-h-9 justify-self-end !rounded-md !shadow-none" disabled={create.isPending}>{create.isPending ? "发布中…" : "发布讨论"}</Button>
      </div>
      <FormError error={create.error || Object.values(form.formState.errors)[0]} />
    </form>}
    <div className="mt-8 flex flex-wrap items-center gap-3 pb-2"><Choice label="排序" value={order} items={[{ value: "active", label: "最近活跃" }, { value: "new", label: "最新发布" }]} onChange={(value) => { setOrder(value); setPage(0); }} /><label className="flex items-center gap-2 text-xs text-muted">话数<input className="h-10 w-24 rounded-xl border border-neutral-200 bg-white px-3 text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/25" type="number" min={1} max={999} placeholder="全部" value={episode} onChange={(event) => { setEpisode(event.target.value); setPage(0); }} /></label></div>
    <FormError error={list.error} />{list.isPending && <p className="py-8 text-sm text-muted">正在读取讨论…</p>}<div id="discussion-list" className="scroll-mt-24 space-y-1">{list.data?.pages[page]?.items.map((thread) => <Link key={thread.id} to="/discussions/$id" params={{ id: thread.id }} className="group block py-4"><ThreadBadges thread={thread} /><h2 className="mt-2 text-lg font-semibold break-words group-hover:text-accent">{thread.title}</h2><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"><span className="inline-flex items-center gap-2"><UserAvatar name={thread.name} className="!size-5" />{thread.name}</span><span>{thread.replies} 条回复</span><span>最近活跃 <PostTime value={thread.lastActivityAt} /></span></div></Link>)}</div>
    {list.data?.pages[0].items.length === 0 && <p className="py-14 text-center text-sm text-muted">暂无讨论</p>}<Pagination page={page} onPageChange={setPage} query={list} label="讨论列表分页" scrollTarget="discussion-list" />
  </CommunityFrame>;
}
