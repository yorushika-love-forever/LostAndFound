# 找光 · 校园失物招领（学生端前端）

这是项目的学生端前端，使用 Vue 3、TypeScript、Vue Router 和 Vite 编写。后端位于 <https://github.com/Dream0627/LostAndFound/tree/change_from_yzd>，使用 Go、Gin、GORM、MySQL 和 JWT。

当前前端范围是普通学生用户页面，管理员页面在另一个 branch 实现。

## 当前完成情况

学生端已经覆盖以下流程：

```text
注册 / 登录
  -> 浏览失物和招领信息
  -> 关键字、类型、地点、完成状态筛选
  -> 查看物品详情和评论
  -> 收藏 / 取消收藏帖子、查看我的收藏
  -> 发表评论、删除自己的评论
  -> 发布失物或招领信息
  -> 上传图片、选择校园地点、一键定位最近地点
  -> 查看和删除自己的发布记录
  -> 对他人的帖子发起认领 / 召领
  -> 进入会话、发送消息
  -> 发起完成寻找申请、同意或拒绝申请、撤回自己发起的申请
  -> 查看全站公告（无需登录）
  -> 修改个人资料、修改密码、注销账号、提交意见反馈
```

账号异常时还可以从公开的 `/appeal` 页面提交账号申诉；全站公告页 `/announcements` 同样无需登录即可查看。

## 前端页面和路由

访问 `/` 会自动跳转到 `/home`。未命中的地址进入 404 页面。

| 路由                    | 页面                                   | 是否需要登录 |
| ----------------------- | -------------------------------------- | ------------ |
| `/login`              | 登录                                   | 否           |
| `/register`           | 注册                                   | 否           |
| `/appeal`             | 账号申诉                               | 否           |
| `/announcements`      | 全站公告（本项目唯一的公开数据页面）   | 否           |
| `/home`               | 信息列表、筛选                         | 是           |
| `/items/:id`          | 物品详情、评论、收藏、认领入口         | 是           |
| `/publish`            | 发布失物 / 招领、一键定位最近地点      | 是           |
| `/mine`               | 我的发布记录                           | 是           |
| `/mine?tab=claims`    | 我的认领 / 会话记录                    | 是           |
| `/mine?tab=favorites` | 我的收藏                               | 是           |
| `/conversations/:id`  | 会话消息、完成寻找申请、撤回申请       | 是           |
| `/profile`            | 个人资料、修改密码、注销账号、意见反馈 | 是           |
| `/:pathMatch(.*)*`    | 404 页面不存在                         | 否           |

除 `/login`、`/register`、`/appeal` 外，`/announcements` 也不需要登录（后端公告接口为公开接口），这是本项目唯一一个不需要登录的数据页面。

### 路由守卫行为

路由使用 `createWebHistory`（正常 URL，非 hash），守卫在 `src/router/index.ts` 中：

- 需要登录的页面未登录访问时，重定向到 `/login?redirect=<原地址>`，登录成功后跳回原地址。
- 已登录用户访问 `/login` 时，直接送回 `redirect` 指定的页面（默认 `/home`）。
- `redirect` 参数经 `safeRedirect()` 过滤，只接受 `/` 开头且非 `//` 开头的站内路径，避免被构造成外部跳转。
- 本地 token 会解析 JWT 的 `exp` 校验有效期；已过期或无法解析时自动登出，避免出现"界面显示已登录、接口却一直返回 401"。
- 每次跳转后按路由 `meta.title` 更新浏览器标签页标题，格式为 `页面名 · 找光`。

## 技术栈

| 类别     | 选型                             |
| -------- | -------------------------------- |
| 框架     | Vue 3（`<script setup>` 组合式 API） |
| 语言     | TypeScript                       |
| 路由     | Vue Router 4（history 模式）     |
| 构建     | Vite 8                           |
| 类型检查 | vue-tsc                          |
| 网络请求 | 原生 `fetch`（封装在 `api/http.ts`） |

## 前端目录

```text
src/
├── api/
│   ├── http.ts             # 统一 fetch、响应信封解包、JWT、401 处理、requestAllPages 自动翻页
│   ├── auth.ts             # 登录、注册、资料、改密、注销
│   ├── posts.ts            # 帖子列表、详情、发布、删除、恢复、收藏 / 取消收藏、我的收藏
│   ├── comments.ts         # 评论查询、发表、删除
│   ├── conversations.ts    # 认领 / 召领、会话、会话详情、消息、完成申请的发起 / 审核 / 撤回
│   ├── announcements.ts    # 全站公告列表（公开接口）
│   ├── feedbacks.ts        # 意见反馈提交
│   ├── appeals.ts          # 公开账号申诉
│   └── geo.ts              # 校园地点、按坐标匹配最近地点
├── components/
│   ├── user/ItemCard.vue   # 物品卡片
│   ├── admin/              # 管理员组件（占位，待实现）
│   └── common/             # 通用组件（占位，待实现）
├── layouts/
│   └── UserLayout.vue      # 学生端导航和页面外壳
├── router/index.ts         # 学生端路由、登录守卫、404 兜底
├── stores/auth.ts          # 当前用户、Token、登录状态
├── types/index.ts          # 用户、帖子、评论、会话、公告等类型
├── utils/format.ts         # 时间和状态格式化
├── styles/                 # 全局样式和学生端样式
├── views/
│   ├── user/
│   │   ├── LoginView.vue
│   │   ├── RegisterView.vue
│   │   ├── AppealView.vue
│   │   ├── HomeView.vue
│   │   ├── ItemDetailView.vue
│   │   ├── PublishView.vue
│   │   ├── MyView.vue
│   │   ├── ConversationView.vue
│   │   ├── ProfileView.vue
│   │   ├── AnnouncementView.vue
│   │   └── NotFoundView.vue
│   └── admin/              # 管理员页面（占位，待实现）
├── App.vue
└── main.ts
```

## 已对接的后端接口

请求前缀由 `VITE_API_BASE_URL` 提供，默认为相对路径 `/api/v1`。
开发环境中 Vite 会把 `/api` 和 `/uploads` 代理到后端，**代理时保持路径原样**，不剥前缀。

| 前端功能           | 接口                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| 注册               | `POST /api/v1/auth/register`                                               |
| 登录               | `POST /api/v1/auth/login`                                                  |
| 查看个人资料       | `GET /api/v1/auth/profile`（同时返回 `posts` 和 `favorites`）               |
| 修改个人资料       | `PATCH /api/v1/auth/profile`                                               |
| 修改密码           | `PATCH /api/v1/auth/password`                                              |
| 注销账号           | `DELETE /api/v1/auth/account`                                              |
| 帖子列表           | `GET /api/v1/posts`                                                        |
| 帖子详情           | `GET /api/v1/posts/:post_id`                                               |
| 发布帖子           | `POST /api/v1/posts`，`multipart/form-data`                              |
| 删除自己的帖子     | `DELETE /api/v1/posts/:post_id`                                            |
| 恢复已删帖子       | `PATCH /api/v1/posts/:post_id/recover`                                     |
| 收藏帖子           | `POST /api/v1/posts/:post_id/favorite`                                     |
| 取消收藏帖子       | `DELETE /api/v1/posts/:post_id/favorite`                                   |
| 我的收藏列表       | `GET /api/v1/auth/profile`（取其中的 `favorites` 字段，无独立列表接口）     |
| 校园地点           | `GET /api/v1/geo/locations`                                                |
| 一键定位最近地点   | `POST /api/v1/geo/locate`                                                  |
| 评论列表           | `GET /api/v1/posts/:post_id/comments`                                      |
| 发表评论           | `POST /api/v1/comments`                                                    |
| 删除评论           | `DELETE /api/v1/comments/:comment_id`                                      |
| 申领 / 召领        | `POST /api/v1/posts/:post_id/conversations`                                |
| 会话列表           | `GET /api/v1/conversations`                                                |
| 会话详情（含帖子快照） | `GET /api/v1/conversations/:conversation_id`                            |
| 会话消息           | `GET /api/v1/conversations/:conversation_id/messages`                      |
| 发送消息           | `POST /api/v1/conversations/:conversation_id/messages`                     |
| 发起完成申请       | `POST /api/v1/conversations/:conversation_id/finish-requests`              |
| 处理完成申请       | `PATCH /api/v1/conversations/:conversation_id/finish-requests/:request_id` |
| 撤回完成申请       | `DELETE /api/v1/conversations/:conversation_id/finish-requests/:request_id` |
| 全站公告（公开）   | `GET /api/v1/announcements`（不需要登录）                                   |
| 提交意见反馈       | `POST /api/v1/feedbacks`                                                   |
| 账号申诉           | `POST /api/v1/appeals`                                                     |

### 列表接口的查询参数

`GET /api/v1/posts` 支持的参数与前端用法：

| 参数        | 说明                                                         |
| ----------- | ------------------------------------------------------------ |
| `type`      | 帖子类型，`lost`（寻找失物）/ `found`（发布招领）           |
| `finished`  | 完成状态，`true` / `false`，不传表示不限                     |
| `keyword`   | 关键词，**后端只对标题（title）做模糊匹配**                 |
| `page`      | 页码，从 1 开始                                              |
| `page_size` | 每页条数                                                     |

- 关键词搜索由后端完成，前端的搜索框因此只承诺"搜索物品名称"。
- 地点筛选后端没有对应参数，仍在前端按地点的 `location_name` 过滤。
- 列表接口是分页的，`src/api/http.ts` 的 `requestAllPages()` 会按每页 100 条逐页取完再返回，避免只取到第一页导致列表残缺。

前端会自动保存 `campus-token`，需要登录的请求会携带：

```http
Authorization: Bearer <access_token>
```

后端响应的统一信封为 `{ code, msg, data }`，`code !== 0` 或 HTTP 非 2xx 时 `request()` 会抛出 `Error(msg)`。收到 401 时会清空本地登录态并广播 `auth-expired` 事件。

当前后端帖子模型没有独立的联系方式字段，因此学生端没有伪造或提交 `contact` 字段。

## 环境变量

| 变量                 | 开发环境                        | 生产环境   | 作用                                                     |
| -------------------- | ------------------------------- | ---------- | -------------------------------------------------------- |
| `VITE_API_BASE_URL`  | `/api/v1`                     | `/api/v1` | 请求前缀，**必须是相对路径**                       |
| `VITE_PROXY_TARGET`  | `http://localhost:8080`       | —         | 仅开发环境使用，Vite 代理的后端地址                      |

- 变量分别写在 `.env.development` 和 `.env.production` 中。
- 生产环境**不要**把 `VITE_API_BASE_URL` 填成后端完整地址：后端已移除 CORS，浏览器直连会被拦截，必须由反向代理同源转发。
- 若要连远程后端调试，新建 `.env.development.local`（已被 `.gitignore` 的 `*.local` 规则排除，不会提交）覆盖代理目标：

  ```text
  VITE_PROXY_TARGET=http://<后端地址>:8080
  ```

## 本地运行

### 1. 前置条件

- Node.js `^22.18.0 || >=24.12.0`（见 `package.json` 的 `engines`）
- Go 环境
- MySQL 数据库

### 2. 启动后端和数据库

后端目录：

```powershell
cd "C:\Users\周杨浩\Desktop\background\LostAndFound"
```

首次运行时：

1. 复制 `config/config.example.yaml` 为 `config/config.yaml`。
2. 在 `config/config.yaml` 中填写 MySQL 连接信息和 JWT secret。
3. 按后端 README 的说明执行 `migrations/tables.sql` 建表。
4. 启动后端：

```powershell
go run main.go
```

后端默认地址：

```text
http://localhost:8080
```

### 3. 启动前端

另开一个终端，进入前端根目录：

```powershell
cd "C:\Users\周杨浩\Desktop\vue-win"
npm install
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173/
```

### 可用的 npm 脚本

| 命令                 | 作用                                             |
| -------------------- | ------------------------------------------------ |
| `npm run dev`      | 启动开发服务器（热更新），仅用于本地调试         |
| `npm run build`    | 类型检查 + 生产构建，产物输出到 `dist/`        |
| `npm run build-only` | 只做生产构建，不跑类型检查                       |
| `npm run type-check` | 只做 `vue-tsc` 类型检查                        |
| `npm run preview`  | 本地预览构建产物（验证用，不是生产部署方式）     |

## 部署

前端是纯静态产物，构建后交给 Web 服务器托管的 Caddy，同时由它反向代理后端接口。

### 架构

```text
浏览器 ──HTTP──> Caddy (:80)
                  ├─ /            → 托管前端静态文件 /var/www/pickup
                  ├─ /api/v1/*    → 反向代理后端 :8080
                  └─ /uploads/*   → 反向代理后端 :8080（图片）
```

前后端同源，因此**前端代码无需配置接口地址、后端也无需开启 CORS**：前端使用相对路径 `/api/v1`，浏览器天然认为同域。

### 1. 构建

```powershell
npm run build
```

产物在 `dist/`。

### 2. 上传静态文件并修正权限

手动上传（把 `<前端服务器IP>` 换成你自己的真实地址）：

```powershell
scp -r "dist\*" root@<前端服务器IP>:/var/www/pickup/
```

上传后必须修正文件权限，否则 Caddy 以 `caddy` 用户运行时读不到文件，页面会白屏：

```bash
chmod -R a+rX /var/www/pickup
```

### 3. Caddy 配置

```caddyfile
:80 {
    encode gzip

    handle /api/* {
        reverse_proxy <后端公网IP>:8080
    }

    handle /uploads/* {
        reverse_proxy <后端公网IP>:8080
    }

    handle {
        root * /var/www/pickup
        try_files {path} /index.html
        file_server
    }
}
```

配置要点：

- **必须用 `handle`，不能用 `handle_path`**。`handle_path` 会在转发前剥掉 `/api` 前缀，`/api/v1/posts` 会变成 `/v1/posts` 而返回 404。
- `try_files {path} /index.html` 是 SPA 路由回退，缺少它时刷新 `/mine` 等路径会 404。
- `/uploads/*` 必须一起反代，否则帖子图片加载不出来。
- 后端已移除 CORS，浏览器只同源访问前端，跨域问题由这层反向代理消除。
- 本项目前后端**不同机**部署，Caddy 直连后端公网地址 `<后端公网IP>:8080`（真实地址不写入仓库，见下方 `deploy.config.ps1`）；**务必用安全组把后端 8080 的入方向限制为只允许前端这台机器访问**，否则后端一旦暴露，任何人都能绕过前端直接打 API。

修改配置后重载：

```bash
sudo systemctl reload caddy
```

### 4. 部署后的验证

```bash
# 首页可访问
curl -I http://<服务器IP>/                                   # 期望 200

# API 反代通（判据：前缀未被剥掉）
curl -s "http://<服务器IP>/api/v1/posts?page=1&page_size=2"   # 期望 code 为 0

# 图片反代通
curl -I http://<服务器IP>/uploads/posts/<文件名>.gif          # 期望 200

# SPA 回退生效（刷新不 404）
curl -I http://<服务器IP>/mine                               # 期望 200
```

其他注意事项：

- 经 `http://<IP>` 访问时浏览器会禁用 `navigator.geolocation`，一键定位不可用，仅能手动选点；需要该功能须配置域名 + HTTPS。
- 国内云服务器绑定域名需完成 ICP 备案，否则 80/443 可能被拦截。
- 建议设置流量告警，防止异常流量产生额外费用。

### 日常更新（修改前端代码后）

项目根目录提供了 [deploy.ps1](deploy.ps1) 一键部署脚本，自动完成构建、产物校验和上传：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

脚本本身**不含任何服务器地址**（本仓库为公开仓库，写死公网 IP 会被扫描全网与 GitHub 的爬虫收录，带来异常访问与流量费用）。首次使用需在同目录创建 `deploy.config.ps1`：

```powershell
$ServerIP   = "你的服务器公网 IP"
$ServerUser = "root"
$RemoteDir  = "/var/www/pickup"
```

`deploy.config.ps1` 已在 `.gitignore` 中，不会被提交；仓库里只提交 `deploy.ps1` 脚本本身。未创建该文件时脚本会给出提示并退出，不会带着空地址去连服务器。

部署完成后浏览器需按 **Ctrl + Shift + R** 强制刷新（脚本也会提示）。更新前端**不需要**重装 Caddy、不需要改 Caddyfile、不需要动安全组。

### 常见问题排查

| 现象                     | 原因                                                         | 处理                                                         |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 页面能打开但一片空白     | 资源返回 MIME 为 `text/html`，即 `assets/*.js` 未命中、回退成了 `index.html` | 执行 `chmod -R a+rX /var/www/pickup`                        |
| 直接刷新 `/home` 出现 404 | 缺少 SPA 回退配置                                            | 检查 Caddyfile 的 `try_files {path} /index.html`            |
| 浏览器完全打不开         | 云服务器安全组未放行 80                                      | 入方向添加 `80/80`、`0.0.0.0/0`                            |
| 页面正常但登录失败       | `/api/*` 反代不通                                            | 服务器执行 `curl -m 5 http://<后端IP>:8080/api/v1/geo/locations` 验证连通性 |
| 图片显示为裂图           | 图片在数据库里存的是相对路径 `/uploads/...`，由 Caddy 的 `/uploads/*` 反向代理提供 | 检查 Caddyfile 的 `/uploads/*` 反向代理是否配置正确          |
| 改了配置不生效           | 未重载 Caddy                                                 | `systemctl reload caddy`                                    |

## 当前未完成范围

以下内容属于管理员端，不在当前学生端实现范围内（相关目录为占位）：

- 失物招领管理员页面
- 帖子审核和状态管理页面
- 系统管理员账号管理
- 公告管理（学生端已支持**查看**公告，仅管理员端的**发布 / 管理**未实现）
- 全校数据总览和统计图表
- 管理员申诉审核

此外，帖子、评论、会话、会话消息和公告等所有列表接口都已统一走 `src/api/http.ts` 的 `requestAllPages()` 自动翻页取全量（默认每页 100 条，逐页拉取直到取满 `total`），不再存在固定只取第一页而被截断的情况。

## 是否需要同时启动前后端服务器？

开发和联调时需要同时启动：

```text
前端 Vite： http://127.0.0.1:5173
后端 API：  http://localhost:8080
数据库：    MySQL
```

原因是前端页面只是界面，登录、帖子、评论、会话和账号数据都由后端 API 提供，后端又依赖 MySQL。

如果只想查看静态页面，可以只运行 `npm run dev`；但登录和所有真实数据功能都会因为没有后端而失败。部署时前端与后端不必在同一台机器，但必须保证前端能访问到后端 API，并通过反向代理实现同源访问。