# Cloud Checkin

## 项目概况

Cloud Checkin 是一个运行在 Cloudflare Workers 上的 API 站点管理和自动签到工具。项目使用 Cloudflare Workers Static Assets 托管前端页面，使用 D1 保存站点、Token、模型、日志和系统设置，使用 Cron Triggers 执行定时任务。

前端使用 React、Vite 和 Tailwind CSS，不依赖 Ant Design、Naive UI 这类组件库。Worker 入口同时处理 `/api` 请求和静态资源请求，静态资源绑定需要保留 `binding = "ASSETS"`。

主要功能：

- API 站点增删改查。
- 手动签到、定时签到、余额刷新、Token 同步、模型刷新。
- Token、模型、签到日志、定时任务日志查看。
- 站点 JSON 导入和导出，导入时按站点名称和 URL 去重。
- 单密码登录，默认登录密码初始化在 D1，修改密码后继续保存到 D1。
- 定时任务由 `wrangler.toml` 维护，系统设置页只读展示当前 Cron 配置。
- 日志保留天数保存在 D1，由历史记录清理任务读取。

`wrangler.toml` 中配置了两条 Cron：

```toml
[triggers]
crons = ["1,32 * * * *", "0 17 * * *"]
```

执行含义：

- `1,32 * * * *`：签到任务，每小时第 1 分钟和第 32 分钟执行。
- `0 17 * * *`：历史记录清理任务，UTC 17:00，也就是北京时间每天 01:00。

Cloudflare Cron 按 UTC 触发。业务代码在需要日期时使用 `Asia/Shanghai` 生成任务日志日期。

## 本地调试

安装依赖并登录 Wrangler：

```powershell
npm install
npx wrangler login
```

创建 D1 数据库：

```powershell
npx wrangler d1 create cloud-checkin-db
```

把命令输出中的 `database_id` 写入 `wrangler.toml` 的 `[[d1_databases]]` 段。即使只做本地调试，也需要保留 `wrangler.toml` 中的 D1 绑定配置。

`wrangler.toml` 的静态资源绑定需要保留 `binding = "ASSETS"`，因为 Worker 入口会调用 `env.ASSETS.fetch(request)` 返回前端页面。

本地开发密钥放在 `.dev.vars`：

```powershell
Copy-Item .env.example .dev.vars
```

然后编辑 `.dev.vars`：

```dotenv
SESSION_SECRET=一段随机长字符串
```

`SESSION_SECRET` 用来签名 session cookie，必须放在本地环境变量或 Cloudflare Secret 中，防止别人伪造登录状态。它不加密数据库，也不会加密 D1 里的站点认证值。Windows 没有 `openssl` 时，可以用 PowerShell 生成：

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

初始化本地 D1 表结构：

```powershell
npm run d1:migrate:local
```

本地数据库初始化后，默认登录密码是：

```text
change-this-password
```

第一次登录后应立即在系统设置里改掉，修改后的密码哈希继续写回 D1。

后端和静态资源一起用 Wrangler 模拟 Cloudflare Worker；本地 dev 会开启 scheduled 测试入口：

```powershell
npm run build
npm run dev
```

打开：

```text
http://127.0.0.1:8787
```

如果要调前端热更新，开两个终端。第一个终端运行 Worker：

```powershell
npm run dev
```

第二个终端运行 Vite：

```powershell
npm run dev:frontend
```

然后访问：

```text
http://127.0.0.1:5173
```

Vite 会把 `/api` 代理到 `http://127.0.0.1:8787`。

本地 dev 会按 `wrangler.toml` 自动模拟 scheduled 事件。先启动 Worker：

```powershell
npm run dev
```

`npm run dev` 会启动 `wrangler dev --test-scheduled`，服务就绪后按配置里的 Cron 自动请求本地 scheduled 测试入口。Cloudflare Cron 按 UTC 匹配，本地模拟也按 UTC 匹配。

如果前端一直停在“加载中...”，先确认 `http://127.0.0.1:8787/api/health` 能立即返回。`npm run dev` 会对本地 Worker 健康检查设置超时；如果 8787 被旧的 `wrangler dev` / `workerd` 占用或健康检查长时间不返回，脚本会报错提示先停止旧本地服务，再重新运行 `npm run dev`。

服务就绪后终端会输出本地定时模拟器状态和下一次触发时间，例如：

```text
[scheduled-dev] local scheduled simulator ready: 1,32 * * * * | 0 17 * * *
[scheduled-dev] next local scheduled trigger: "1,32 * * * *" at 2026-05-03 04:32 UTC
```

到点触发时会继续输出：

```text
[scheduled-dev] local scheduled trigger due: "1,32 * * * *" at 2026-05-03 04:32 UTC
[scheduled-dev] scheduled trigger sent for "1,32 * * * *"
```

需要临时调试时，也可以另开一个终端立即模拟签到任务 Cron：

```powershell
npm run cron:local
```

或立即模拟历史记录清理任务 Cron：

```powershell
npm run cron:cleanup:local
```

`npm run dev`、`npm run dev:frontend`、`npm run typecheck`、`npm run build` 在执行前都会先运行 `npm run sync:wrangler-crons`，把 `wrangler.toml` 里的 Cron 同步到 `shared/generated/wrangler-crons.ts`。这一步只是为了让 Worker 代码和前端只读展示能消费同一份配置；真正可编辑的来源仍然只有 `wrangler.toml`。

`wrangler dev` 默认使用本地 D1 数据，不会直接修改线上 D1。线上变更需要 `--remote` 或部署后的 Worker。

## 云端部署流程

安装依赖并登录 Wrangler：

```powershell
npm install
npx wrangler login
```

创建 Cloudflare D1 数据库：

```powershell
npx wrangler d1 create cloud-checkin-db
```

把命令输出中的 `database_id` 写入 `wrangler.toml` 的 `[[d1_databases]]` 段。云端部署必须使用正确的远程 D1 `database_id`，否则 Worker 无法访问预期数据库。

`wrangler.toml` 的静态资源绑定需要保留 `binding = "ASSETS"`，因为部署后的 Worker 入口会调用 `env.ASSETS.fetch(request)` 返回前端页面。

把远程 D1 迁移跑上去：

```powershell
npm run d1:migrate:remote
```

配置生产环境密钥：

```powershell
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` 是生产环境必需密钥，不能放到 D1。它用来签名 session cookie，防止别人伪造登录状态。它不加密数据库，也不会加密 D1 里的站点认证值。

部署到 Cloudflare：

```powershell
npm run deploy
```

部署完成后，远程数据库初始化后的默认登录密码是：

```text
change-this-password
```

第一次登录后应立即在系统设置里改掉，修改后的密码哈希继续写回远程 D1。

云端定时任务只通过 `wrangler.toml` 维护：

```toml
[triggers]
crons = ["1,32 * * * *", "0 17 * * *"]
```

执行含义：

- `1,32 * * * *`：签到任务，每小时第 1 分钟和第 32 分钟执行。
- `0 17 * * *`：历史记录清理任务，UTC 17:00，也就是北京时间每天 01:00。

Cloudflare Cron 按 UTC 触发。业务代码在需要日期时使用 `Asia/Shanghai` 生成任务日志日期。

如果修改了 Cron、静态资源、Worker 代码或前端代码，都需要重新部署：

```powershell
npm run deploy
```

系统设置页会只读显示当前 Cron，并提示如需修改必须改 `wrangler.toml` 后重新部署。日志保留天数仍保存在 D1，由清理任务读取。

如果远程 API 站点屏蔽 Cloudflare 出口请求，签到、余额刷新或同步可能失败。站点认证值和登录密码按需求明文保存到 D1。
