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
  -> 发表评论、删除自己的评论
  -> 发布失物或招领信息
  -> 上传图片、选择校园地点
  -> 查看和删除自己的发布记录
  -> 对他人的帖子发起认领 / 召领
  -> 进入会话、发送消息
  -> 发起完成寻找申请、同意或拒绝申请
  -> 修改个人资料、修改密码、注销账号
```

账号异常时还可以从公开的 `/appeal` 页面提交账号申诉。

## 前端页面和路由

访问 `/` 会自动跳转到 `/home`。未命中的地址进入 404 页面。

| 路由                   | 页面                         | 是否需要登录 |
| ---------------------- | ---------------------------- | ------------ |
| `/login`             | 登录                         | 否           |
| `/register`          | 注册                         | 否           |
| `/appeal`            | 账号申诉                     | 否           |
| `/home`              | 信息列表、筛选               | 是           |
| `/items/:id`         | 物品详情、评论、认领入口     | 是           |
| `/publish`           | 发布失物 / 招领              | 是           |
| `/mine`              | 我的发布记录                 | 是           |
| `/mine?tab=claims`   | 我的认领 / 会话记录          | 是           |
| `/conversations/:id` | 会话消息、完成寻找申请       | 是           |
| `/profile`           | 个人资料、修改密码、注销账号 | 是           |
| `/:pathMatch(.*)*`   | 404 页面不存在               | 否           |

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
│   ├── http.ts             # 统一 fetch、响应信封解包、JWT、401 处理、列表分页循环
│   ├── auth.ts             # 登录、注册、资料、改密、注销
│   ├── posts.ts            # 帖子列表、详情、发布、删除、恢复
│   ├── comments.ts         # 评论查询、发表、删除
│   ├── conversations.ts    # 认领 / 召领、会话、消息、完成申请
│   ├── appeals.ts          # 公开账号申诉
│   └── geo.ts              # 校园地点
├── components/
│   ├── user/ItemCard.vue   # 物品卡片
│   ├── admin/              # 管理员组件（占位，待实现）
│   └── common/             # 通用组件（占位，待实现）
├── layouts/
│   └── UserLayout.vue      # 学生端导航和页面外壳
├── router/index.ts         # 学生端路由、登录守卫、404 兜底
├── stores/auth.ts          # 当前用户、Token、登录状态
├── types/index.ts          # 用户、帖子、评论、会话等类型
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
│   │   └── NotFoundView.vue
│   └── admin/              # 管理员页面（占位，待实现）
├── App.vue
└── main.ts
```

## 已对接的后端接口

请求前缀由 `VITE_API_BASE_URL` 提供，默认为相对路径 `/api/v1`。
开发环境中 Vite 会把 `/api` 和 `/uploads` 代理到后端，**代理时保持路径原样**，不剥前缀。

| 前端功能       | 接口                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| 注册           | `POST /api/v1/auth/register`                                               |
| 登录           | `POST /api/v1/auth/login`                                                  |
| 查看个人资料   | `GET /api/v1/auth/profile`（同时返回 `posts` 和 `favorites`）               |
| 修改个人资料   | `PATCH /api/v1/auth/profile`                                               |
| 修改密码       | `PATCH /api/v1/auth/password`                                              |
| 注销账号       | `DELETE /api/v1/auth/account`                                              |
| 帖子列表       | `GET /api/v1/posts`                                                        |
| 帖子详情       | `GET /api/v1/posts/:post_id`                                               |
| 发布帖子       | `POST /api/v1/posts`，`multipart/form-data`                              |
| 删除自己的帖子 | `DELETE /api/v1/posts/:post_id`                                            |
| 恢复已删帖子   | `PATCH /api/v1/posts/:post_id/recover`                                     |
| 校园地点       | `GET /api/v1/geo/locations`                                                |
| 评论列表       | `GET /api/v1/posts/:post_id/comments`                                      |
| 发表评论       | `POST /api/v1/comments`                                                    |
| 删除评论       | `DELETE /api/v1/comments/:comment_id`                                      |
| 申领 / 召领    | `POST /api/v1/posts/:post_id/conversations`                                |
| 会话列表       | `GET /api/v1/conversations`                                                |
| 会话消息       | `GET /api/v1/conversations/:conversation_id/messages`                      |
| 发送消息       | `POST /api/v1/conversations/:conversation_id/messages`                     |
| 发起完成申请   | `POST /api/v1/conversations/:conversation_id/finish-requests`              |
| 处理完成申请   | `PATCH /api/v1/conversations/:conversation_id/finish-requests/:request_id` |
| 账号申诉       | `POST /api/v1/appeals`                                                     |

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
- 列表接口是分页的，`src/api/http.ts` 的 `requestAllPages()` 会逐页取完再返回，避免只取到第一页导致列表残缺。

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

### 1. 构建

```powershell
npm run build
```

产物在 `dist/`，上传到服务器（示例）：

```bash
scp -r dist/* root@<服务器IP>:/var/www/pickup/
```

### 2. Caddy 配置

```caddyfile
:80 {
	root * /var/www/pickup
	encode gzip

	@backend path /api/* /uploads/*
	handle @backend {
		reverse_proxy 127.0.0.1:8080
	}

	handle {
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
- Caddy 与后端在同一台机器时用 `127.0.0.1:8080`，安全组无需对公网放行 8080。

修改配置后重载：

```bash
sudo systemctl reload caddy
```

### 3. 部署后的验证

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

## 当前未完成范围

以下内容属于管理员端，不在当前学生端实现范围内（相关目录为占位）：

- 失物招领管理员页面
- 帖子审核和状态管理页面
- 系统管理员账号管理
- 公告管理
- 全校数据总览和统计图表
- 管理员申诉审核

列表类接口（帖子、评论、会话、会话消息）均已通过 `requestAllPages()` 循环取全量，不再受单页条数限制。

不过 `getMyClaims()` 仍存在 N+1 请求：它会对每个会话单独调用一次帖子详情接口来取标题，会话较多时会发出较多请求。

## 是否需要同时启动前后端服务器？

开发和联调时需要同时启动：

```text
前端 Vite： http://127.0.0.1:5173
后端 API：  http://localhost:8080
数据库：    MySQL
```

原因是前端页面只是界面，登录、帖子、评论、会话和账号数据都由后端 API 提供，后端又依赖 MySQL。

如果只想查看静态页面，可以只运行 `npm run dev`；但登录和所有真实数据功能都会因为没有后端而失败。部署时前端与后端不必在同一台机器，但必须保证前端能访问到后端 API，并通过反向代理实现同源访问。
