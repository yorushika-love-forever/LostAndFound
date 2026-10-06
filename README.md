# 校园失物招领系统

这是项目的学生端前端，使用 Vue 3、TypeScript、Vue Router 和 Vite 编写。后端位于(https://github.com/Dream0627/LostAndFound/tree/change_from_yzd)，使用 Go、Gin、GORM、MySQL 和 JWT。

当前前端范围是普通学生用户页面，管理员页面暂未实现。后端接口契约参考 [LostAndFound/frontend-demo/README.md](LostAndFound/frontend-demo/README.md)。

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

## 前端目录

```text
src/
├── api/
│   ├── http.ts             # 统一 fetch、响应信封、JWT、401 处理
│   ├── auth.ts             # 登录、注册、资料、改密、注销
│   ├── posts.ts            # 帖子列表、详情、发布、删除
│   ├── comments.ts         # 评论查询、发表、删除
│   ├── conversations.ts    # 认领 / 召领、会话、消息、完成申请
│   ├── appeals.ts          # 公开账号申诉
│   └── geo.ts              # 校园地点
├── components/user/
│   └── ItemCard.vue        # 物品卡片
├── layouts/
│   └── UserLayout.vue      # 学生端导航和页面外壳
├── router/index.ts         # 学生端路由和登录守卫
├── stores/auth.ts          # 当前用户、Token、登录状态
├── types/index.ts          # 用户、帖子、评论、会话等类型
├── utils/format.ts         # 时间和状态格式化
├── styles/                 # 全局样式和学生端样式
└── views/user/
    ├── LoginView.vue
    ├── RegisterView.vue
    ├── AppealView.vue
    ├── HomeView.vue
    ├── ItemDetailView.vue
    ├── PublishView.vue
    ├── MyView.vue
    ├── ConversationView.vue
    └── ProfileView.vue
```

## 已对接的后端接口

前端默认请求前缀为 `/api/v1`，请求会由 Vite 代理到 `http://localhost:8080`。

| 前端功能       | 接口                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| 注册           | `POST /api/v1/auth/register`                                               |
| 登录           | `POST /api/v1/auth/login`                                                  |
| 查看个人资料   | `GET /api/v1/auth/profile`                                                 |
| 修改个人资料   | `PATCH /api/v1/auth/profile`                                               |
| 修改密码       | `PATCH /api/v1/auth/password`                                              |
| 注销账号       | `DELETE /api/v1/auth/account`                                              |
| 帖子列表       | `GET /api/v1/posts`                                                        |
| 帖子详情       | `GET /api/v1/posts/:post_id`                                               |
| 发布帖子       | `POST /api/v1/posts`，`multipart/form-data`                              |
| 删除自己的帖子 | `DELETE /api/v1/posts/:post_id`                                            |
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

前端会自动保存 `campus-token`，需要登录的请求会携带：

```http
Authorization: Bearer <access_token>
```

当前后端帖子模型没有独立的联系方式字段，因此学生端没有伪造或提交 `contact` 字段。

## 本地运行

### 1. 前置条件

- Node.js 22 或更高版本
- Go 环境
- MySQL 数据库

### 2. 启动后端和数据库

进入后端目录：

```powershell
cd "C:\Users\周杨浩\Desktop\hello_vue3\LostAndFound"
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
cd "C:\Users\周杨浩\Desktop\hello_vue3"
npm install
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173/
```

开发环境中，Vite 会把 `/api` 和 `/uploads` 代理到后端 `http://localhost:8080`。

## 验证命令

```powershell
npm run type-check
npm run build
```

当前两条命令均已通过。生产构建文件输出到 `dist/`。

## 当前未完成范围

以下内容属于管理员端，不在当前学生端实现范围内：

- 失物招领管理员页面
- 帖子审核和状态管理页面
- 系统管理员账号管理
- 公告管理
- 全校数据总览和统计图表
- 管理员申诉审核

## 是否需要同时启动前后端服务器？

开发和联调时需要同时启动：

```text
前端 Vite： http://127.0.0.1:5173
后端 API：  http://localhost:8080
数据库：    MySQL
```

原因是前端页面只是界面，登录、帖子、评论、会话和账号数据都由后端 API 提供，后端又依赖 MySQL。

如果只想查看静态页面，可以只运行 `npm run dev`；但登录和所有真实数据功能都会因为没有后端而失败。部署时也不一定要把两者放在同一台云服务器上，但必须保证前端能够访问后端 API，并正确配置跨域或反向代理。
