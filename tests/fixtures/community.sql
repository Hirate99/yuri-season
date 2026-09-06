-- Local D1 only: bunx wrangler d1 execute DB --env test --local --file tests/fixtures/community.sql
-- Idempotent inserts preserve edits made during manual testing.
INSERT OR IGNORE INTO auth_users (id, name, email, email_verified, banned, created_at, updated_at) VALUES
  ('test-community-hana', '花间', 'hana@example.test', 1, 0, 1788580800000, 1788580800000),
  ('test-community-tsuki', '月见', 'tsuki@example.test', 1, 0, 1788580800000, 1788580800000),
  ('test-community-muted', '测试禁言账号', 'muted@example.test', 1, 1, 1788580800000, 1788580800000);

INSERT OR IGNORE INTO community_threads (id, anime_id, author_id, title, episode, spoiler, pinned, locked, hidden, created_at, last_activity_at) VALUES
  ('test-community-main', 'anime-kimishinu', 'test-community-hana', '【本地测试】聊聊这一话最喜欢的瞬间', 1, 0, 1, 0, 0, 1788580800000, 1788580900000),
  ('test-community-spoiler', 'anime-kimishinu', 'test-community-tsuki', '【本地测试】结尾镜头与伏笔讨论', 2, 1, 0, 0, 0, 1788580900000, 1788580900000),
  ('test-community-locked', 'anime-kimishinu', 'test-community-hana', '【本地测试】已锁定的讨论', NULL, 0, 0, 1, 0, 1788580800000, 1788580800000),
  ('test-community-hidden', 'anime-kimishinu', 'test-community-muted', '【本地测试】已隐藏的讨论', NULL, 0, 0, 0, 1, 1788580800000, 1788580800000);

INSERT OR IGNORE INTO community_posts (id, thread_id, author_id, body, floor, created_at, updated_at)
SELECT id, id, author_id, '这是隔离本地测试库中的演示讨论。可以测试发言、引用、评论和管理操作。', 1, created_at, created_at
FROM community_threads WHERE id IN ('test-community-main', 'test-community-spoiler', 'test-community-locked', 'test-community-hidden');

WITH RECURSIVE floors(n) AS (SELECT 2 UNION ALL SELECT n + 1 FROM floors WHERE n < 25)
INSERT OR IGNORE INTO community_posts (id, thread_id, author_id, body, floor, reply_to_id, hidden, created_at, updated_at)
SELECT 'test-community-floor-' || n, 'test-community-main',
  CASE WHEN n % 2 = 0 THEN 'test-community-tsuki' ELSE 'test-community-hana' END,
  CASE WHEN n = 2 THEN '我喜欢结尾停顿的那几秒。这里可以展开楼内评论，回复其他人的感想。'
       WHEN n = 3 THEN '引用二楼：配乐也在这里停了，刚好留出回味的空间。'
       WHEN n = 4 THEN '这个隐藏楼层的正文和被引用摘要都不应公开。'
       WHEN n = 5 THEN '引用四楼；原楼隐藏时，引用摘要也应隐藏。'
       ELSE '分页测试 · 第 ' || n || ' 楼。' END,
  n, CASE WHEN n = 3 THEN 'test-community-floor-2' WHEN n = 5 THEN 'test-community-floor-4' END,
  CASE WHEN n = 4 THEN 1 ELSE 0 END, 1788580800000 + n * 1000, 1788580800000 + n * 1000
FROM floors;

WITH RECURSIVE comments(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM comments WHERE n < 23)
INSERT OR IGNORE INTO community_posts (id, thread_id, author_id, body, parent_post_id, reply_to_id, hidden, created_at, updated_at)
SELECT 'test-community-comment-' || n, 'test-community-main',
  CASE WHEN n % 2 = 0 THEN 'test-community-tsuki' ELSE 'test-community-hana' END,
  CASE WHEN n = 1 THEN '二楼说得好，我也反复看了那段。'
       WHEN n = 2 THEN '回复花间：还有前面那个对视，和结尾呼应了。'
       WHEN n = 3 THEN '回复月见：对！我准备再看一次。'
       WHEN n = 4 THEN '隐藏评论：其他评论不应再显示这条摘要。'
       WHEN n = 5 THEN '回复已隐藏的评论，原内容应显示占位。'
       ELSE '楼内评论分页测试 · 第 ' || n || ' 条。' END,
  'test-community-floor-2', CASE WHEN n BETWEEN 2 AND 5 THEN 'test-community-comment-' || (n - 1) END,
  CASE WHEN n = 4 THEN 1 ELSE 0 END, 1788580850000 + n * 1000, 1788580850000 + n * 1000
FROM comments;

INSERT OR IGNORE INTO community_reports (id, post_id, reporter_id, reason, created_at) VALUES
  ('test-community-report', 'test-community-floor-4', 'test-community-tsuki', '本地测试举报：验证审核、恢复与标记已处理。', 1788580900000);
