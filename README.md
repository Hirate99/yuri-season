# YuriSeason

当季百合动画、播出日历、Staff / Cast、公式与创作者动态、角色生日、贺图 / 同人和社区讨论索引。站点使用 React SSR、Cloudflare Workers 与 D1；生产环境将公开站和 Admin 拆成两个 Worker，共用同一份数据。

## 本地开发

```powershell
bun install
Copy-Item .dev.vars.example .dev.vars
bun run cf-typegen
bun run db:migrate:local
bun run dev
```

站点默认在 `http://localhost:3000`。Admin 位于 `/admin`；生产环境由独立 Admin Worker 承接，并由 Cloudflare Access 和 Worker 邮箱白名单共同保护。公开 Worker 不受 Access 影响。`ADMIN_TOKEN` 只供本地开发和自动化脚本使用，页面不会要求手填 token。

## Local-first 更新

第一阶段不注册 Cloudflare Cron，也不让 Worker 常驻调用模型。配置本地环境变量后运行确定性增量检查：

```powershell
$env:YURI_RADAR_URL="http://localhost:3000"
$env:YURI_ADMIN_TOKEN="your-admin-token"
bun run research:diff
```

只有条目级内容发生变化时，`.research-cache/pending-diff.json` 才会出现。首次检查只建立基线，相同状态复检也不会调用模型。差异分成 `catalogChanges` 与 `feedChanges`：Bangumi 元数据只更新资料，不进入情报流；只有真正的动态才进入提取与审核。官网采用 JSON 时可配置 `item_url_template`，避免前端渲染造成漏抓。使用 `skills/yuri-season-research` 核验变化并生成一个合并批次，导入成功后再执行 `bun run research:commit`。

如果生产 Admin 同时受 Access 保护，为本地 agent 配置 Access Service Token，并设置 `YURI_ACCESS_CLIENT_ID` 与 `YURI_ACCESS_CLIENT_SECRET`；脚本仍会在 Worker 层使用独立的 `YURI_ADMIN_TOKEN`，两层凭证缺一不可。

研究脚本会自动读取仓库根目录的 `.dev.vars`。其中的 `ADMIN_TOKEN` 可作为 `YURI_ADMIN_TOKEN` 使用，生产地址默认是 `https://i-yuri.com`；因此配置完成后，增量检查、发现记录和批次导入都不需要浏览器或电脑界面。

## 部署

```powershell
bunx wrangler login
bunx wrangler d1 create yuri-season-radar
bun run cf-typegen
bun run db:migrate:remote
bunx wrangler secret put ADMIN_TOKEN
bun run deploy:all
```

首次创建 D1 后，把 Wrangler 返回的数据库 ID 写回 `wrangler.jsonc`。Access 应只覆盖 `/admin*` 与 `/api/admin*`，公开片单与详情页不受影响。首个 Allow 邮箱是 `haonan.su@outlook.com`；自动化使用单独的 Service Auth 策略。若未来启用 Worker 调度，需要同时将 `UPDATE_MODE` 改为 `worker` 并显式配置来源级 Cron，不开启全站高频轮询。

## Cloudflare CI/CD

生产发布沿用 `homepage` 的 Cloudflare Workers Builds，不使用 GitHub Actions，也不在 GitHub 保存 Cloudflare Token。公开站和 Admin 是两个 Worker，因此都连接同一个 GitHub 仓库；Cloudflare 官方会分别监听同一次 `main` 推送。

`yuri-season-radar`：

- Production branch: `main`
- Build command: `bun run cf-typegen`
- Deploy command: `bun run deploy:cloudflare:public`
- Non-production branch builds: 关闭

`yuri-season-radar-admin`：

- Production branch: `main`
- Build command: `bun run cf-typegen`
- Deploy command: `bun run deploy:cloudflare:admin`
- Non-production branch builds: 关闭

Cloudflare 管理 GitHub 授权与各自的 Build Token。公开站构建负责远程 D1 migration，两个 Worker 随同一提交分别发布，互不覆盖。

## 内容边界

- 外部内容只保存有限证据、摘要、原始链接、来源和时间，不镜像正文。
- 作者贺图与同人默认 `link_only`，突出创作者和原平台。
- 角色生日必须有一手来源；贴吧、NGA、百合会等只索引集中讨论入口。
- 本地 LLM 审核不能绕过服务器的来源、分级、剧透和置信阈值。
