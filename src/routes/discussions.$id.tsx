import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { postInput, reportInput } from "@/domain/community";
import TextareaAutosize from "react-textarea-autosize";
import { useRevealPost } from "@/features/community/use-reveal-post";
import { MarkdownEditor } from "@/features/community/markdown-editor";
import { PostBody } from "@/features/community/markdown";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState, type ReactNode } from "react";
import { MessageSquare, Quote, ThumbsUp, X } from "lucide-react";
import { Button, Pagination, UserAvatar } from "@/features/community/controls";
import type { listReplies } from "~/repositories/community";
import { authClient } from "@/features/community/auth-client";
import { CommunityFrame, field, FormError, LoginPrompt, PostTime, ThreadBadges } from "@/features/community/shared";
import { apiClient, rpcData } from "@/lib/rpc";
import { primaryButton, textButton } from "@/lib/ui";

type FloorPost = Awaited<ReturnType<typeof listReplies>>["items"][number];
type Post = Omit<FloorPost, "commentPreviews">;
const endpoint = apiClient.api.community;
export const Route = createFileRoute("/discussions/$id")({ ssr: false, remountDeps: ({ params }) => params.id, head: () => ({ meta: [{ title: "讨论串 · YuriSeason" }, { name: "robots", content: "noindex" }] }), component: Thread });

function Thread() {
  const { id } = Route.useParams();
  const { data: session, isPending } = authClient.useSession();
  const [quote, setQuote] = useState<Post | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [replyPage, setReplyPage] = useState(0);
  const query = useQuery({ queryKey: ["community", "thread", id, session?.user.id ?? null], queryFn: () => rpcData(endpoint.threads[":id"].$get({ param: { id } })) });
  const thread = query.data;
  const visible = Boolean(thread && (!thread.spoiler || revealed));
  const repliesKey = ["community", "replies", id, session?.user.id ?? null];
  const replies = useInfiniteQuery({ queryKey: repliesKey, initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => rpcData(endpoint.threads[":id"].replies.$get({ param: { id }, query: pageParam ? { cursor: pageParam } : {} })),
    getNextPageParam: (last) => last.nextCursor ?? undefined, enabled: visible,
  });
  const revealReply = useRevealPost(repliesKey, replies, setReplyPage);
  const userId = session?.user.banned ? undefined : session?.user.id;
  function quoteFloor(post: Post) { setQuote(post); requestAnimationFrame(() => document.getElementById("thread-reply")?.scrollIntoView({ behavior: "smooth", block: "center" })); }
  return <CommunityFrame fill><FormError error={query.error} />{query.isPending && <p>正在读取讨论…</p>}{thread && <>
    <Link className="text-xs font-semibold text-muted hover:text-ink" to="/anime/$slug/discussions" params={{ slug: thread.anime.slug }}>← {thread.anime.title} · 讨论</Link>
    <header className="mt-5 mb-5"><ThreadBadges thread={thread} /><h1 className="mt-2 text-xl leading-snug font-bold break-words md:text-2xl">{thread.title}</h1><div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted"><span>{thread.replies} 条回复与评论</span>{visible && !thread.locked && !session?.user.banned && <a href="#thread-reply" className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-accent"><MessageSquare size={14} />回复</a>}</div></header>
    {!visible ? <div className="surface p-7"><h2 className="font-semibold">这段讨论包含剧透{thread.episode ? ` · 第 ${thread.episode} 话` : ""}</h2><p className="mt-3 text-sm text-muted">确认看完后再展开正文和回复。</p><button className={`${primaryButton} mt-5`} onClick={() => setRevealed(true)}>展开讨论</button></div> : <>
      <div id="thread-posts" className="scroll-mt-24 space-y-3 [&>article:nth-child(odd)]:bg-neutral-50 [&>article:nth-child(even)]:bg-white">{[...(replyPage === 0 ? [thread.post] : []), ...(replies.data?.pages[replyPage]?.items ?? [])].filter(Boolean).map((post) => <Floor key={post.id} post={post} userId={userId} locked={thread.locked} onQuote={quoteFloor} />)}</div>
      <FormError error={replies.error} /><Pagination page={replyPage} onPageChange={setReplyPage} query={replies} label="楼层分页" scrollTarget="thread-posts" />
      <section id="thread-reply" className="mt-auto scroll-mt-24 pt-8">{thread.locked ? <p className="surface p-5 text-sm text-muted">讨论已锁定，暂时无法回复或评论。</p> : session?.user.banned ? <p className="text-sm text-rose-700">账号已被禁言。</p> : userId ? <Composer threadId={id} onCreated={revealReply} quote={quote} onCancelQuote={() => setQuote(null)} /> : !isPending && <LoginPrompt />}</section>
    </>}
  </>}</CommunityFrame>;
}

function Floor({ post, userId, locked, onQuote }: { post: FloorPost; userId?: string; locked: boolean; onQuote: (post: Post) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <article id={`post-${post.id}`} tabIndex={-1} className="group/floor scroll-mt-24 overflow-hidden rounded-xl outline-none"><span id={`floor-${post.floor}`} className="block scroll-mt-24" />
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 px-4 py-4 sm:grid-cols-[32px_minmax(0,1fr)] md:px-5 md:py-5">
      <UserAvatar name={post.name} className="!size-7 sm:!size-8" />
      <div className="min-w-0"><PostContent post={post} userId={userId} locked={locked} actions={<>
        {userId && !locked && <button className="inline-flex items-center gap-1.5" onClick={() => onQuote(post)}><Quote size={12} />引用此楼</button>}
        <button className="inline-flex items-center gap-1.5 aria-expanded:text-accent" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><MessageSquare size={12} />{expanded ? "收起楼内评论" : `楼内评论${post.comments ? ` · ${post.comments}` : ""}`}</button>
      </>} /></div>
    </div>
    {!post.hidden && (expanded || post.comments > 0) && <div className="mr-4 mb-4 ml-14 rounded-lg bg-neutral-100/70 px-3 pt-1 pb-4 group-odd/floor:bg-white/65 sm:px-4 sm:pb-5 sm:ml-15 md:mr-5 md:mb-5 md:ml-16"><Comments post={post} userId={userId} locked={locked} expanded={expanded} onExpand={() => setExpanded(true)} /></div>}
  </article>;
}

function PostContent({ post, userId, locked, onReply, actions, preview = false, parentFloor }: { post: Post; userId?: string; locked: boolean; onReply?: (post: Post) => void; actions?: ReactNode; preview?: boolean; parentFloor?: number | null }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"edit" | "report" | null>(null);
  const form = useForm({ resolver: zodResolver(z.object({ body: mode === "report" ? reportInput.shape.reason : postInput.shape.body })), defaultValues: { body: "" } });
  const save = useMutation({ mutationFn: ({ body }: { body: string }) => mode === "edit"
    ? rpcData(endpoint.posts[":id"].$patch({ param: { id: post.id }, json: { body } }))
    : rpcData(endpoint.posts[":id"].reports.$post({ param: { id: post.id }, json: { reason: body } })),
    onSuccess: () => { setMode(null); void queryClient.invalidateQueries({ queryKey: ["community"] }); },
  });
  const like = useMutation({
    mutationFn: () => rpcData(endpoint.posts[":id"].like.$put({ param: { id: post.id }, json: { liked: !post.liked } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community"] }),
  });
  function open(next: "edit" | "report") { form.reset({ body: next === "edit" ? post.body : "" }); save.reset(); setMode(next); }
  return <>
    <div className="mb-2 flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="font-semibold">{post.name}</span><span className="text-muted"><PostTime value={post.createdAt} />{post.updatedAt > post.createdAt && " · 已编辑"}</span>{post.floor !== null && <a href={`#floor-${post.floor}`} className="ml-auto font-mono text-neutral-400 hover:text-accent">#{post.floor}</a>}{post.commentNumber !== null && <span className="ml-auto font-mono text-neutral-400" title={`第 ${parentFloor} 楼 · 第 ${post.commentNumber} 条评论`}>#{parentFloor}-{post.commentNumber}</span>}</div>
    {post.hidden ? <p className="py-3 text-sm text-muted">这条内容已被隐藏。</p> : mode === "edit" ? <form noValidate onSubmit={form.handleSubmit((value) => save.mutate(value))}>
      <MarkdownEditor aria-label="编辑内容" className="block w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-accent/60" minRows={3} maxLength={10000} {...form.register("body")} value={form.watch("body")} />
      <FormError error={form.formState.errors.body || save.error} />
      <div className="mt-3 flex gap-3"><Button type="submit" className="!min-h-8 !rounded-md !px-3 !shadow-none" disabled={save.isPending}>保存</Button><button type="button" className={textButton} disabled={save.isPending} onClick={() => setMode(null)}>取消</button></div>
    </form> : <>
      {post.replyToId && <blockquote className="mb-2 bg-neutral-50 px-3 py-2 text-xs leading-5 text-muted"><span className="font-medium text-accent">{post.replyToFloor !== null ? `引用 #${post.replyToFloor} 楼` : `回复 ${post.replyToName ?? "原评论作者"}`}</span><p className="mt-0.5 whitespace-pre-wrap break-words">{post.replyToExcerpt ?? "原内容已隐藏"}</p></blockquote>}
      <PostBody preview={preview}>{post.body}</PostBody>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted sm:gap-x-4 [&_button]:min-h-8 [&_button]:transition-colors [&_button:hover]:text-accent"><button type="button" aria-label={post.liked ? "取消点赞" : "点赞"} aria-pressed={post.liked} title={!userId ? "登录后可点赞" : `${post.likes} 个赞`} disabled={!userId || locked || like.isPending} onClick={() => like.mutate()} className={`inline-flex w-10 shrink-0 items-center gap-1 disabled:cursor-default ${post.liked ? "text-accent" : ""}`}><ThumbsUp size={13} className="shrink-0" fill={post.liked ? "currentColor" : "none"} /><span className="min-w-0 flex-1 truncate text-left tabular-nums">{post.likes || "赞"}</span></button>{actions}{userId && <>{onReply && !locked && <button onClick={() => onReply(post)}>回复</button>}{post.authorId === userId && !locked && !preview && <button disabled={save.isPending} onClick={() => open("edit")}>编辑</button>}<button disabled={save.isPending} onClick={() => open("report")}>举报</button></>}</div>
      <FormError error={like.error} />
      {mode === "report" && <form noValidate className="mt-4 space-y-3" onSubmit={form.handleSubmit((value) => save.mutate(value))}><label htmlFor={`report-${post.id}`} className="block text-sm">举报原因</label><TextareaAutosize id={`report-${post.id}`} className={`${field} resize-none`} minRows={3} required maxLength={500} {...form.register("body")} /><FormError error={form.formState.errors.body || save.error} /><div className="flex gap-3"><button className={primaryButton} disabled={save.isPending}>提交</button><button type="button" className={textButton} disabled={save.isPending} onClick={() => setMode(null)}>取消</button></div></form>}
      {save.isSuccess && <p role="status" className="mt-3 text-xs text-green-700">已提交</p>}
    </>}
  </>;
}

function Comments({ post, userId, locked, expanded, onExpand }: { post: FloorPost; userId?: string; locked: boolean; expanded: boolean; onExpand: () => void }) {
  const [replyTarget, setReplyTarget] = useState<Post | null>(null);
  const [commentPage, setCommentPage] = useState(0);
  const commentsKey = ["community", "comments", post.id, userId ?? null];
  const comments = useInfiniteQuery({ queryKey: commentsKey, initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => rpcData(endpoint.posts[":id"].comments.$get({ param: { id: post.id }, query: pageParam ? { cursor: pageParam } : {} })),
    getNextPageParam: (last) => last.nextCursor ?? undefined, enabled: expanded,
  });
  const revealComment = useRevealPost(commentsKey, comments, setCommentPage);
  const page = expanded ? comments.data?.pages[commentPage] : undefined;
  return <div id={`comments-${post.id}`} className="scroll-mt-24 [overflow-anchor:none]">
    <div className="space-y-1">{(page?.items ?? post.commentPreviews).map((comment) => <div key={comment.id} id={`post-${comment.id}`} tabIndex={-1} className="flex scroll-mt-24 gap-2.5 py-3 outline-none"><UserAvatar name={comment.name} className="!size-6" /><div className="min-w-0 flex-1"><PostContent post={comment} userId={userId} locked={locked} preview={!page} parentFloor={post.floor} onReply={(comment) => { setReplyTarget(comment); onExpand(); }} /></div></div>)}</div>
    <FormError error={comments.error} />
    {!page && <button className="min-h-8 text-xs font-semibold text-accent" disabled={expanded && comments.isFetching} onClick={() => { onExpand(); if (comments.isError) void comments.refetch(); }}>{expanded ? comments.isError ? "重试加载评论" : "正在读取评论…" : `展开全部评论 · ${post.comments}`}</button>}
    {page && <><Pagination page={commentPage} onPageChange={setCommentPage} query={comments} label="楼内评论分页" scrollTarget={`comments-${post.id}`} />{userId && !locked ? <Composer parent={post} onCreated={revealComment} quote={replyTarget} onCancelQuote={() => setReplyTarget(null)} /> : page.items.length === 0 && <p className="pt-5 text-xs text-muted">暂无楼内评论。</p>}</>}
  </div>;
}

function Composer({ threadId, parent, quote, onCancelQuote, onCreated }: { threadId?: string; parent?: Post; quote?: Post | null; onCancelQuote?: () => void; onCreated: (id: string) => Promise<void> }) {
  const form = useForm({ resolver: zodResolver(postInput.pick({ body: true })), defaultValues: { body: "" } });
  const { setFocus } = form;
  useEffect(() => { if (quote) setFocus("body"); }, [quote, setFocus]);
  const send = useMutation({ mutationFn: ({ body }: { body: string }) => parent
    ? rpcData(endpoint.posts[":id"].comments.$post({ param: { id: parent.id }, json: { body, replyToId: quote?.id } }))
    : rpcData(endpoint.threads[":id"].replies.$post({ param: { id: threadId! }, json: { body, replyToId: quote?.id } })),
    onSuccess: async ({ id }) => { form.reset(); onCancelQuote?.(); await onCreated(id); },
  });
  return <form noValidate className={parent ? "pt-2" : ""} onSubmit={form.handleSubmit((value) => send.mutate(value))}>
    <label htmlFor={parent ? `comment-${parent.id}` : "reply-body"} className={parent ? "sr-only" : "mb-3 block text-sm font-semibold"}>{parent ? `评论 #${parent.floor} 楼` : "发布回复"}</label>
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition focus-within:border-accent/60">
      {quote && <div className="flex items-center justify-between gap-3 bg-neutral-50 px-3 py-2 text-xs text-muted"><span className="text-accent">{parent ? `回复 ${quote.name}` : `引用 #${quote.floor} 楼`}</span><button type="button" className="grid size-6 place-items-center hover:text-ink" aria-label="取消引用或回复" onClick={onCancelQuote}><X size={14} /></button></div>}
      <MarkdownEditor id={parent ? `comment-${parent.id}` : "reply-body"} className={`block w-full resize-none bg-transparent px-3 text-sm leading-6 outline-none focus-visible:outline-none ${parent ? "py-2" : "py-3"}`} minRows={parent ? 1 : 3} required maxLength={10000} placeholder={parent ? `回复 #${parent.floor} 楼…` : "输入回复，支持 Markdown…"} {...form.register("body")} value={form.watch("body")} />
      <div className={`flex items-center justify-end gap-3 ${parent ? "px-2 pb-2" : "px-3 pb-3"}`}>{send.isSuccess && <p role="status" className={parent ? "sr-only" : "mr-auto text-xs text-green-700"}>已发布</p>}<Button type="submit" aria-label={parent ? "发表评论" : undefined} className={`!min-h-8 !rounded-md !shadow-none ${parent ? "!px-2.5" : "!px-3"}`} disabled={send.isPending}>{send.isPending ? "发布中…" : parent ? "发送" : "发布回复"}</Button></div>
    </div>
    <FormError error={form.formState.errors.body || send.error} />
  </form>;
}
