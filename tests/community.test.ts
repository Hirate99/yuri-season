import { afterEach, beforeEach, expect, test } from "bun:test";
import { api } from "~/http/api";
import { TestD1 } from "./support/d1-adapter";
import type { getThread, listComments, listReplies, listThreads, moderationQueue } from "~/repositories/community";

let db: TestD1;
let env: Env;
let mail: { to: string; text: string }[];
const origin = "https://community.test";
beforeEach(async () => {
  db = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) db.exec(await Bun.file(path).text());
  mail = [];
  env = {
    DB: db.binding(), ADMIN_TOKEN: "test-admin",
    BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "community-test-secret-with-at-least-32-characters",
    AUTH_EMAIL_FROM: "noreply@community.test",
    EMAIL: { send: async (message: { to: string; text: string }) => { mail.push(message); return { messageId: "test" }; } },
  } as unknown as Env;
});
afterEach(() => db.close());

function request(path: string, body?: unknown, cookie?: string, method = "POST") {
  return api.request(`${origin}/api/${path}`, {
    method, headers: { origin, "content-type": "application/json", "cf-connecting-ip": "127.0.0.1", ...(cookie ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, env);
}
async function login(email = "reader@example.com") {
  const sent = await request("auth/email-otp/send-verification-otp", { email, type: "sign-in" });
  expect(sent.status).toBe(200);
  const otp = mail.at(-1)!.text.match(/\b\d{6}\b/)![0];
  const response = await request("auth/sign-in/email-otp", { email, otp, name: "读者" });
  expect(response.status).toBe(200);
  const { user } = await response.json() as { user: { id: string; email: string; emailVerified: boolean } };
  return { cookie: response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; "), user, otp };
}

test("email OTP creates a verified account; codes are hashed, single-use, and logout revokes the session", async () => {
  const { cookie, user, otp } = await login();
  expect(user.emailVerified).toBe(true);
  expect(cookie).toContain("session_token");
  const session = await request("auth/get-session", undefined, cookie, "GET");
  expect((await session.json() as { user: { id: string } }).user.id).toBe(user.id);
  expect((await request("auth/sign-in/email-otp", { email: user.email, otp })).status).not.toBe(200);
  await request("auth/email-otp/send-verification-otp", { email: "second@example.com", type: "sign-in" });
  expect(JSON.stringify(db.sqlite.query("SELECT value FROM auth_verifications").all())).not.toContain(mail.at(-1)!.text.match(/\b\d{6}\b/)![0]);
  expect((await request("auth/sign-out", {}, cookie)).status).toBe(200);
  expect(await (await request("auth/get-session", undefined, cookie, "GET")).json()).toBeNull();
});

function cooldown() { db.exec("UPDATE auth_users SET last_posted_at = 0"); }

test("OTP attempts and expiry cannot be bypassed, and missing mail configuration fails closed", async () => {
  const email = "attempts@example.com";
  await request("auth/email-otp/send-verification-otp", { email, type: "sign-in" });
  const otp = mail.at(-1)!.text.match(/\b\d{6}\b/)![0];
  const wrong = otp === "000000" ? "111111" : "000000";
  for (let i = 0; i < 3; i++) expect((await request("auth/sign-in/email-otp", { email, otp: wrong })).status).not.toBe(200);
  expect((await request("auth/sign-in/email-otp", { email, otp })).status).not.toBe(200);
  await request("auth/email-otp/send-verification-otp", { email: "expired@example.com", type: "sign-in" });
  const expiredOtp = mail.at(-1)!.text.match(/\b\d{6}\b/)![0];
  db.exec("UPDATE auth_verifications SET expires_at = 1");
  expect((await request("auth/sign-in/email-otp", { email: "expired@example.com", otp: expiredOtp })).status).not.toBe(200);
  env.EMAIL = undefined;
  expect((await request("auth/email-otp/send-verification-otp", { email: "unavailable@example.com", type: "sign-in" })).status).toBe(503);
  expect((await api.request(`${origin}/api/auth/sign-in/email-otp`, { method: "POST", headers: { origin: "https://evil.test", cookie: "test=1", "cf-connecting-ip": "127.0.0.2", "content-type": "application/json" }, body: JSON.stringify({ email, otp }) }, env)).status).toBe(403);
});
async function read<T>(path: string) { const response = await request(path, undefined, undefined, "GET"); expect(response.status).toBe(200); return response.json() as Promise<T>; }
async function create(cookie: string) {
  cooldown();
  const slug = (db.sqlite.query("SELECT slug FROM anime LIMIT 1").get() as { slug: string }).slug;
  const response = await request(`community/anime/${slug}/threads`, { title: "第 1 话讨论", body: "主帖", episode: 1, spoiler: true }, cookie);
  expect(response.status).toBe(201);
  return { ...await response.json() as { id: string }, slug };
}
function admin(id: string, body: unknown) {
  return api.request(`${origin}/api/admin/community/${id}`, { method: "PATCH", headers: { authorization: "Bearer test-admin", "content-type": "application/json" }, body: JSON.stringify(body) }, env);
}

test("floors, quotes and comments remain distinct; hidden floors preserve numbering and redact quotes", async () => {
  const { cookie } = await login();
  const image = "https://community.test/avatar.png";
  expect((await request("auth/update-user", { image }, cookie)).status).toBe(403);
  const { id, slug } = await create(cookie);
  cooldown();
  const second = await request(`community/threads/${id}/replies`, { body: "第二楼", replyToId: id }, cookie);
  expect(second.status).toBe(201);
  const { id: floorId } = await second.json() as { id: string };
  cooldown();
  const comment = await request(`community/posts/${floorId}/comments`, { body: "楼内评论" }, cookie);
  expect(comment.status).toBe(201);
  const { id: commentId } = await comment.json() as { id: string };
  expect((await request(`community/posts/${commentId}/comments`, { body: "不允许嵌套楼内评论" }, cookie)).status).toBe(404);
  let replyToId = commentId;
  for (const body of ["回复评论", "继续回复"]) {
    cooldown();
    const response = await request(`community/posts/${floorId}/comments`, { body, replyToId }, cookie);
    expect(response.status).toBe(201);
    replyToId = (await response.json() as { id: string }).id;
  }
  cooldown();
  expect((await request(`community/posts/${id}/comments`, { body: "跨楼回复", replyToId: commentId }, cookie)).status).toBe(400);
  expect((await request(`community/threads/${id}/replies`, { body: "主楼不能引用楼内评论", replyToId: commentId }, cookie)).status).toBe(400);
  cooldown();
  expect((await request(`community/threads/${id}/replies`, { body: "第三楼", replyToId: floorId }, cookie)).status).toBe(201);
  const floors = await read<Awaited<ReturnType<typeof listReplies>>>(`community/threads/${id}/replies`);
  expect(floors.items.map((post) => post.floor)).toEqual([2, 3]);
  expect(floors.items[1].replyToFloor).toBe(2);
  expect(floors.items[1].replyToExcerpt).toBe("第二楼");
  expect(floors.items[0].comments).toBe(3);
  const comments = await read<Awaited<ReturnType<typeof listComments>>>(`community/posts/${floorId}/comments`);
  expect(comments.items[0].floor).toBeNull();
  expect(comments.items[0].body).toBe("楼内评论");
  expect(comments.items.map((item) => item.parentPostId)).toEqual([floorId, floorId, floorId]);
  expect(comments.items.every((item) => item.floor === null)).toBe(true);
  expect(comments.items[1]).toMatchObject({ replyToId: commentId, replyToName: "读者", replyToExcerpt: "楼内评论" });
  expect(comments.items[2].replyToId).toBe(comments.items[1].id);
  await admin(commentId, { kind: "post", hidden: true });
  const hiddenComment = await read<Awaited<ReturnType<typeof listComments>>>(`community/posts/${floorId}/comments`);
  expect(hiddenComment.items[1].replyToExcerpt).toBeNull();
  cooldown();
  expect((await request(`community/posts/${floorId}/comments`, { body: "回复隐藏评论", replyToId: commentId }, cookie)).status).toBe(400);
  expect((await admin(floorId, { kind: "post", hidden: true })).status).toBe(200);
  const hidden = await read<Awaited<ReturnType<typeof listReplies>>>(`community/threads/${id}/replies`);
  expect(hidden.items.map((post) => post.floor)).toEqual([2, 3]);
  expect(hidden.items[0].body).toBe("");
  expect(hidden.items[1].replyToExcerpt).toBeNull();
  expect((await request(`community/posts/${floorId}/comments`, undefined, undefined, "GET")).status).toBe(404);
  const publicList = await read<Awaited<ReturnType<typeof listThreads>>>(`community/anime/${slug}/threads`);
  expect(JSON.stringify(publicList)).not.toContain("reader@example.com");
  expect(JSON.stringify(publicList)).not.toContain("session_token");
});

test("likes are idempotent, viewer-specific, reversible, and respect moderation", async () => {
  const reader = await login(), other = await login("liker@example.com");
  const { id } = await create(reader.cookie);
  cooldown();
  const comment = await request(`community/posts/${id}/comments`, { body: "可点赞的评论" }, reader.cookie);
  const commentId = (await comment.json() as { id: string }).id;
  const like = (postId: string, liked = true, cookie?: string) => request(`community/posts/${postId}/like`, { liked }, cookie, "PUT");
  const view = async (cookie?: string) => (await request(`community/threads/${id}`, undefined, cookie, "GET")).json() as Promise<Awaited<ReturnType<typeof getThread>>>;
  const reaction = async (response: Response | Promise<Response>) => (await response).json() as Promise<{ likes: number; liked: boolean }>;
  expect((await like(id)).status).toBe(401);
  for (let n = 0; n < 2; n++) expect(await reaction(like(id, true, reader.cookie))).toEqual({ likes: 1, liked: true });
  expect(await reaction(like(id, true, other.cookie))).toEqual({ likes: 2, liked: true });
  expect((await view(reader.cookie)).post).toMatchObject({ likes: 2, liked: true });
  expect((await view()).post).toMatchObject({ likes: 2, liked: false });
  for (let n = 0; n < 2; n++) expect(await reaction(like(id, false, reader.cookie))).toEqual({ likes: 1, liked: false });
  expect((await view(reader.cookie)).post.liked).toBe(false);
  expect((await view(other.cookie)).post.liked).toBe(true);
  expect(await reaction(like(commentId, true, other.cookie))).toEqual({ likes: 1, liked: true });
  const comments = await request(`community/posts/${id}/comments`, undefined, other.cookie, "GET");
  expect((await comments.json() as Awaited<ReturnType<typeof listComments>>).items[0]).toMatchObject({ likes: 1, liked: true });
  expect((await view(other.cookie)).post.commentPreviews[0]).toMatchObject({ likes: 1, liked: true });
  await admin(id, { kind: "thread", locked: true });
  expect((await like(commentId, false, other.cookie)).status).toBe(403);
  await admin(id, { kind: "thread", locked: false });
  await admin(other.user.id, { kind: "user", banned: true });
  expect((await like(commentId, false, other.cookie)).status).toBe(403);
  await admin(id, { kind: "post", hidden: true });
  expect((await like(commentId, true, reader.cookie)).status).toBe(403);
  expect((await like("missing", true, reader.cookie)).status).toBe(403);
  expect(db.sqlite.query("SELECT count(*) AS n FROM community_likes").get()).toEqual({ n: 2 });
});

test("write boundaries enforce sessions, same origin, ownership, cooldown, locks, bans, and admin identity", async () => {
  const reader = await login(), other = await login("other@example.com");
  const { id } = await create(reader.cookie), second = await create(other.cookie);
  expect((await request(`community/threads/${id}/replies`, { body: "匿名" })).status).toBe(401);
  expect((await api.request(`${origin}/api/community/threads/${id}/replies`, { method: "POST", headers: { cookie: reader.cookie, origin: "https://evil.test", "content-type": "application/json" }, body: '{"body":"cross-site"}' }, env)).status).toBe(403);
  cooldown();
  expect((await request(`community/posts/${id}`, { body: "冒名编辑" }, other.cookie, "PATCH")).status).toBe(403);
  expect((await request(`community/threads/${id}/replies`, { body: "跨串引用", replyToId: second.id }, reader.cookie)).status).toBe(400);
  cooldown();
  expect((await request(`community/threads/${id}/replies`, { body: "正常回复" }, reader.cookie)).status).toBe(201);
  expect((await request(`community/posts/${id}/comments`, { body: "过快" }, reader.cookie)).status).toBe(429);
  await admin(id, { kind: "thread", locked: true }); cooldown();
  expect((await request(`community/threads/${id}/replies`, { body: "锁定" }, reader.cookie)).status).toBe(403);
  expect((await request(`community/posts/${id}/comments`, { body: "锁定评论" }, reader.cookie)).status).toBe(403);
  expect((await request(`community/posts/${id}`, { body: "锁定编辑" }, reader.cookie, "PATCH")).status).toBe(403);
  await admin(id, { kind: "thread", locked: false });
  await admin(reader.user.id, { kind: "user", banned: true }); cooldown();
  expect((await request(`community/threads/${id}/replies`, { body: "被禁言" }, reader.cookie)).status).toBe(403);
  expect((await request("admin/community", undefined, reader.cookie, "GET")).status).toBe(401);
  cooldown();
  expect((await request(`community/posts/${id}/reports`, { reason: "垃圾内容" }, other.cookie)).status).toBe(200);
  const queue = await api.request(`${origin}/api/admin/community`, { headers: { authorization: "Bearer test-admin" } }, env);
  expect(queue.status).toBe(200);
  const report = (await queue.json() as Awaited<ReturnType<typeof moderationQueue>>).reports[0];
  expect(report.reason).toBe("垃圾内容");
  await admin(report.id, { kind: "report", resolved: true });
  expect((db.sqlite.query("SELECT count(*) AS count FROM audit_log WHERE action = 'moderate_community'").get() as { count: number }).count).toBe(4);
  await admin(id, { kind: "thread", hidden: true });
  expect((await request(`community/threads/${id}`, undefined, undefined, "GET")).status).toBe(404);
});

test("floor and comment pagination preserve hidden numbering and batch bounded previews", async () => {
  const { cookie, user } = await login();
  const { id } = await create(cookie);
  const insert = db.sqlite.prepare("INSERT INTO community_posts(id, thread_id, author_id, body, floor, hidden, created_at, updated_at) VALUES (?, ?, ?, '内容', ?, ?, 1, 1)");
  for (let floor = 2; floor <= 25; floor++) insert.run(`floor-${floor}`, id, user.id, floor, floor === 10 ? 1 : 0);
  const insertComment = db.sqlite.prepare("INSERT INTO community_posts(id, thread_id, author_id, body, parent_post_id, hidden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const parent of [id, "floor-2", "floor-10"]) for (let n = 1; n <= 12; n++) insertComment.run(`${parent}-comment-${n}`, id, user.id, "评论".repeat(200), parent, n === 1 ? 1 : 0, n, n);
  db.resetMetrics();
  const first = await read<Awaited<ReturnType<typeof listReplies>>>(`community/threads/${id}/replies`);
  expect(db.calls).toBe(3);
  expect(first.items[0].commentPreviews.map((comment) => comment.commentNumber)).toEqual([2, 3]);
  expect(first.items[0].commentPreviews[0].body.length).toBe(240);
  expect(first.items.find((post) => post.floor === 10)?.commentPreviews).toEqual([]);
  const next = await read<Awaited<ReturnType<typeof listReplies>>>(`community/threads/${id}/replies?cursor=${encodeURIComponent(first.nextCursor!)}`);
  expect([...first.items, ...next.items].map((post) => post.floor)).toEqual(Array.from({ length: 24 }, (_, i) => i + 2));
  expect(next.nextCursor).toBeNull();
  const root = await read<Awaited<ReturnType<typeof getThread>>>(`community/threads/${id}`);
  expect(root.post.floor).toBe(1);
  expect(root.post.commentPreviews.map((comment) => comment.commentNumber)).toEqual([2, 3]);
  const comments = await read<Awaited<ReturnType<typeof listComments>>>(`community/posts/${id}/comments`);
  const moreComments = await read<Awaited<ReturnType<typeof listComments>>>(`community/posts/${id}/comments?cursor=${encodeURIComponent(comments.nextCursor!)}`);
  expect(comments.items).toHaveLength(10);
  expect(comments.items[0]).toMatchObject({ commentNumber: 1, hidden: true, body: "" });
  expect(moreComments.items.map((comment) => comment.commentNumber)).toEqual([11, 12]);
  expect(moreComments.nextCursor).toBeNull();
});
