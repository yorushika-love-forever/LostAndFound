
# 校园失物招领系统｜学生端前端

这是校园失物招领系统的学生端前端，使用 Vue 3、TypeScript、Vue Router 和 Vite 开发。后端完整接口位于 `LostAndFound/`，接口约定和全部后端能力请参考 [frontend-demo/README.md](LostAndFound/frontend-demo/README.md)。

当前前端只负责普通学生用户界面，管理员页面由其他成员负责。

## 当前完成进度

学生端已经完成以下主流程：

```text
登录
  ↓
进入首页
  ↓
查询、搜索、筛选失物/招领信息
  ↓
查看物品详情
  ├─ 发布者：查看自己的帖子状态
  └─ 其他用户：发起认领/召领对话
       ↓
     查看认领记录并发送消息

登录用户还可以：
  ├─ 发布失物或招领信息
  ├─ 上传图片
  ├─ 选择校园地点和补充说明
  ├─ 查看自己的发布记录
  └─ 删除自己的帖子
```

### 已对接的后端接口

| 前端功能                 | 接口                                                     |
| ------------------------ | -------------------------------------------------------- |
| 登录                     | `POST /api/v1/auth/login`                              |
| 获取个人资料和自己的帖子 | `GET /api/v1/auth/profile`                             |
| 查询帖子列表             | `GET /api/v1/posts`                                    |
| 查询帖子详情             | `GET /api/v1/posts/:post_id`                           |
| 发布帖子                 | `POST /api/v1/posts`，`multipart/form-data`          |
| 删除自己的帖子           | `DELETE /api/v1/posts/:post_id`                        |
| 获取校园地点             | `GET /api/v1/geo/locations`                            |
| 发起申领/召领对话        | `POST /api/v1/posts/:post_id/conversations`            |
| 查看我的会话             | `GET /api/v1/conversations`                            |
| 查看会话消息             | `GET /api/v1/conversations/:conversation_id/messages`  |
| 发送会话消息             | `POST /api/v1/conversations/:conversation_id/messages` |

## 学生端目录

```text
src/
├── api/
│   ├── http.ts             # 统一请求、响应信封、Token、401 处理
│   ├── auth.ts             # 登录、个人资料
│   ├── posts.ts            # 帖子查询、发布、删除
│   ├── conversations.ts    # 认领/召领和消息
│   └── geo.ts              # 校园地点
├── components/user/
│   └── ItemCard.vue        # 首页单条物品卡片
├── layouts/
│   └── UserLayout.vue      # 学生端顶部导航和页面外壳
├── views/user/
│   ├── LoginView.vue       # 登录页
│   ├── HomeView.vue        # 首页、搜索和筛选
│   ├── PublishView.vue     # 发布失物/招领
│   ├── ItemDetailView.vue  # 物品详情和认领入口
│   ├── MyView.vue          # 我的发布和我的认领
│   └── ConversationView.vue # 认领沟通
├── stores/auth.ts          # 当前用户、Token、退出登录
├── router/index.ts         # 学生端路由和登录守卫
├── types/index.ts          # 用户、帖子、会话等数据类型
├── utils/format.ts         # 状态和时间格式化
└── styles/                 # 通用样式和学生端样式
```

## 页面和接口的完整调用链

### 登录

```text
LoginView.vue
  → stores/auth.ts
  → api/auth.ts
  → api/http.ts
  → POST /api/v1/auth/login
  → 保存 campus-token 和 campus-user
  → 跳转 /home
```

后端响应遵循统一信封：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "access_token": "...",
    "user": {
      "id": 1,
      "username": "20240001",
      "name": "张三",
      "role": "student"
    }
  }
}
```

后续需要登录的请求会自动携带：

```http
Authorization: Bearer <campus-token>
```

### 首页

```text
HomeView.vue
  → getItems(query)
  → GET /api/v1/posts?page=1&page_size=100
  → 前端按关键字和地点过滤
  → ItemCard.vue 渲染列表
```

支持的筛选条件：

- 关键字：标题、描述、地点、地点补充说明
- 类型：`lost` 失物、`found` 招领
- 完成状态：未完成、已完成、全部

### 发布

```text
PublishView.vue
  → 选择类型、标题、描述、校园地点、图片
  → 组装 FormData
  → POST /api/v1/posts
  → 后端返回 pending
  → 跳转 /mine
```

发布接口是 `multipart/form-data`，不能手动设置 `Content-Type`，浏览器需要自动生成 boundary。

### 详情和认领

```text
ItemDetailView.vue
  → GET /api/v1/posts/:post_id
  → 显示物品详情
  → POST /api/v1/posts/:post_id/conversations
  → POST /api/v1/conversations/:conversation_id/messages
  → 跳转会话页面
```

当前后端把“认领申请”设计为“申领/召领对话”。前端会把用户填写的认领依据作为会话中的第一条消息发送。

### 我的记录

```text
MyView.vue
  ├─ GET /api/v1/auth/profile
  │    → 我的发布
  ├─ GET /api/v1/conversations
  │    → 我的认领/会话
  └─ DELETE /api/v1/posts/:post_id
       → 删除自己的帖子
```

## 本地运行

安装依赖：

```sh
npm install
```

启动前端：

```sh
npm run dev
```

默认地址：

```text
http://127.0.0.1:5173/
```

Vite 会把以下请求代理到后端 `http://localhost:8080`：

```text
/api
/uploads
```

启动后端后，前端才能正常登录和读取数据。

## 当前边界和下一步

当前没有在学生端实现：

- 失物招领管理员页面
- 系统管理员页面
- 公告管理
- 全校统计图表
- 管理员审核页面

这些功能属于其他成员负责的管理端范围。

另外，当前后端帖子模型和发布接口没有返回独立的联系方式字段，因此学生端暂时没有伪造联系方式。若后端后续增加 `contact` 字段，再在 `types/index.ts`、`api/posts.ts` 和 `PublishView.vue` 中补充即可。

## 检查命令

类型检查：

```sh
npm run type-check
```

生产构建：

```sh
npm run build
```
