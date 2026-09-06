# 用户账号与动画讨论

账号由 Better Auth 管理，邮件验证码同时用于注册和登录。用户与会话存储在现有 D1，邮件使用 Cloudflare Email Sending Worker binding。现有管理员继续使用 Cloudflare Access；普通用户登录不会获得管理员权限。

## 页面与互动

- `/account`：验证码登录、修改昵称、退出、最近 50 条发言。当前使用昵称首字的文字头像；头像上传暂未开放，不接收外部图片地址，服务端同时禁用头像修改。
- `/anime/:slug/discussions`：动画讨论列表，支持最新发布 / 最近活跃、话数筛选、发帖及剧透标记。
- `/discussions/:id`：主帖为 1 楼，其余主楼层顺序编号。引用楼层会发布新的主楼层；楼内评论可以互相回复，显示回复对象与原评论摘要，所有回复仍平铺在同一楼内，不占主楼层编号。
- 主楼层和楼内评论支持点赞与取消点赞，`community_likes` 以 `(post_id, user_id)` 为主键去重。点赞状态按会话返回，匿名只读计数；隐藏内容、隐藏父楼层、锁定讨论和禁言账号不能操作。点赞不触发发言冷却，也不改变讨论活跃时间。
- `/admin/community`：举报处理、隐藏 / 恢复、锁帖、置顶、禁言 / 解禁。管理操作进入现有审计日志。

主楼层和楼内评论共用 `community_posts`：主楼层有 `floor`，评论的 `parent_post_id` 始终指向所属主楼层；`reply_to_id` 表示引用楼层或回复的楼内评论。评论回复只能指向同楼尚未隐藏的评论。数据库约束两种形态互斥，楼层编号在写入事务里分配，隐藏后保留占位。引用只存来源 ID，显示来源当前的前 200 字；隐藏来源时不再暴露摘要。

讨论正文保存 Markdown 源码，使用 react-markdown + remark-gfm 渲染；启用 skipHtml，禁止原始 HTML，保留默认安全 URL 过滤，不使用 rehype-raw 或 dangerouslySetInnerHTML。Markdown 图片暂时只显示替代文字，不加载外部图片。发帖、回复和编辑输入框使用 react-textarea-autosize 自动调整高度，关闭手动拖动。有 Markdown 语法时，桌面端在输入区右侧实时预览，手机端通过预览按钮切换，纯文本保持单栏。第一版没有私信、关注和附件上传。列表及主帖以外的楼层每页 20 条，楼内评论每页 10 条；评论编号显示为 `#楼层-序号`，按时间和 ID 排序，隐藏评论保留编号占位。每楼默认展示 2 条可见评论预览，随楼层列表批量查询，正文截取前 240 字；展开后再请求完整评论和独立分页，加载期间保留预览，避免列表先收缩再撑开。预览不提供编辑，避免用截断正文覆盖原文。页码按已获取的游标逐页开放，翻页缓存由 TanStack Query 管理，并提供第一页和最后一页按钮；跳到最后一页会沿游标补齐未缓存的页面。发布回复或楼内评论后自动切到对应页并聚焦新内容，回复框在短讨论中也保持在页面底部。顶栏复用 Better Auth 会话，已登录显示昵称，未登录显示“我的账号”。社区页面暂设 `noindex`，不加入站点地图。

## 上线前配置

1. 在 Cloudflare Email Service 中启用 Email Sending，并完成 `i-yuri.com` 发信域名验证。按控制台要求配置 SPF、DKIM、DMARC 等记录。该功能目前需要 Workers 付费方案及 Email Sending 使用资格。
2. 仓库已声明 `EMAIL` binding、`BETTER_AUTH_URL=https://i-yuri.com` 和 `AUTH_EMAIL_FROM=noreply@i-yuri.com`。如使用其他发件地址或域名，先修改 `wrangler.jsonc`。不要使用 Email Routing 的仅验证收件人转发配置来替代用户验证码邮件发送。
3. 为公共 Worker 设置独立的随机密钥（至少 32 字符）：`bunx wrangler secret put BETTER_AUTH_SECRET`。不能复用 `ADMIN_TOKEN`。管理员 Worker 不需要邮件或认证密钥。
4. 先备份 D1，再应用 `0039_community.sql` 和 `0040_community_likes.sql`，最后部署公共 Worker 和管理员 Worker。仓库现有 `db:migrate:remote`、`deploy`、`deploy:admin` 脚本可用于这些操作。本次实现不会自动执行线上迁移、配置密钥或发送真实邮件。
5. 用获授权的真实邮箱验收收信、验证码登录、退出，以及楼层 / 楼内评论 / 管理流程。只有完成真实投递验收后才能认定邮件链路已上线。

官方配置参考：[Cloudflare 发信入门](https://developers.cloudflare.com/email-service/get-started/send-emails/)、[Worker API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)、[Better Auth Email OTP](https://better-auth.com/docs/plugins/email-otp)。

## 本地验证

复制 `.dev.vars.example` 所需字段到本地 `.dev.vars`，将 `BETTER_AUTH_URL` 设置为浏览器实际访问的 origin。`.dev.vars` 不提交到 Git。未配置认证密钥时，登录接口返回“用户登录暂未开放”。本地 Email Sending 不会真实投递；没有开发用固定验证码或绕过登录的接口。

`bun test tests/community.test.ts` 用真实 Better Auth、全部 SQLite 迁移和内存邮件发送器验证验证码与会话、身份隔离、楼层引用 / 评论、隐藏内容及分页。`bun test` 和 `bun run build` 检查现有功能及公共构建；管理员构建可在 PowerShell 设置 `$env:CLOUDFLARE_ENV='admin'` 后执行 `bun run build`。

隔离的本地测试库使用 `test` 环境。在忽略提交的 `.dev.vars.test` 中分别设置随机 `ADMIN_TOKEN` 和 `BETTER_AUTH_SECRET`，然后运行：

```powershell
bunx wrangler d1 migrations apply DB --env test --local
bunx wrangler d1 execute DB --env test --local --file tests/fixtures/community.sql
$env:CLOUDFLARE_ENV='test'
$env:CLOUDFLARE_VITE_FORCE_LOCAL='true'
bun run dev --host 127.0.0.1 --port 4317
```

访问 `http://127.0.0.1:4317/anime/kimishinu/discussions`。初始数据包含 3 个用户、4 个讨论、28 个主楼层、23 条楼内评论和 1 条举报，覆盖引用、评论互相回复、分页、剧透、锁定、隐藏和禁言。导入可重复执行，已有记录不覆盖；测试邮箱为 `hana@example.test`、`tsuki@example.test`。验证码由本地邮件模拟器写入 `.wrangler/tmp/email/`，终端会显示邮件文件路径。测试环境不绑定远程 AI，也不会创建远程数据库或发送真实邮件。

默认开发环境使用另一个本地数据库，首次启动社区功能需另行执行 `bunx wrangler d1 migrations apply DB --local`，并将 `.dev.vars` 中的 `BETTER_AUTH_URL` 设为实际访问地址（如 `http://localhost:3000`）。

## 运行边界

验证码 6 位，5 分钟有效，最多 3 次错误尝试，数据库仅保存哈希。Better Auth 使用 D1 持久化请求限流；发帖、评论、编辑和举报共享每用户 30 秒冷却。自定义写接口校验 Origin、会话和当前禁言状态，Cookie 由认证库管理。认证实例按请求创建，通过库的 after hook 将邮件发送失败转为 503，避免库内部吞掉异常后页面误报成功。邮件验证码无法代替站点级反滥用策略；运营时可按实际流量配置 Cloudflare 限流。

所有社区 API 默认 `no-store`，公开响应不包含邮箱、会话令牌。禁言限制发言，账号仍可登录和退出。用户与现有社交来源 `accounts`、外站链接 `discussions` 使用独立表。
