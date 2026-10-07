# 校园失物招领管理端

这是校园失物招领系统的管理员前端，使用 Vue 3、TypeScript、Vue Router、Axios 和 Vite 编写。

后端使用 Go、Gin、GORM、MySQL 和 JWT。前端业务代码统一通过 `/api/v1`访问接口，不写后端服务器 IP。

本地开发时，Vite 从 `.env.development` 读取 `VITE_PROXY_TARGET`，再把 `/api` 请求代理到后端。

管理端包含失物招领管理员和系统管理员两类用户界面。学生端由项目中的另一个前端负责，与管理端共用同一套后端接口。

## 当前完成情况

管理端已经覆盖以下流程：
管理员登录
  -> 登录状态持久化
  -> 路由权限检查
  -> 查看数据总览
  -> 查询帖子
  -> 审核帖子
  -> 修改帖子状态
  -> 查看公告管理页面
  -> 查看用户管理页面
  -> 查看认领处理页面

当前后端已经开放的接口可以直接使用：
登录
管理员资料
帖子列表
帖子审核
帖子状态修改

当前存在以下后端缺口：
1. 学生端使用“会话 + 完成申请”，管理员账号看不到全站会话。
2. /api/v1/announcements 和 /api/v1/admin/announcements 返回 404。
3. 只有注销用户的 DELETE /api/v1/admin/users/:id。
4. 没有用户列表、启用/禁用和修改角色接口。

后端尚未开放的接口：
全站认领管理
用户列表和角色管理
公告完整管理
统计接口

对应页面已经完成，并通过 `src/admin/config.ts` 控制是否发送请求。
后端接口部署后，将对应配置从 `false` 改成 `true`，再根据实际返回字段调整`src/admin/types.ts` 和 `src/api/admin.ts`。

## 角色与权限

后端角色共三种：
student       普通学生
postadmin     失物招领管理员
mainadmin     系统管理员

### 失物招领管理员

- 查看数据总览
- 查询帖子
- 审核帖子
- 修改帖子状态
- 处理认领

### 系统管理员

系统管理员在项目权限设计中拥有失物招领管理员的全部权限，另外还应当可以
管理账号、修改角色、启用或禁用用户、管理公告和查看全校统计。

下面是当前代码与后端部署的真实状态：

| 目标权限         | 前端入口                 | 当前状态                                       |
| 查看全校数据统计  | `/admin/dashboard`     | 已显示帖子总量、待审核、已通过和通过率         |
| 管理公告         | `/admin/announcements` | 页面和请求代码已准备，后端接口尚未部署         |
| 管理账号         | `/admin/users`         | 页面和请求代码已准备，后端没有用户列表接口     |
| 修改用户角色      | `/admin/users`         | 页面和请求代码已准备，后端接口尚未部署         |
| 启用或禁用用户    | `/admin/users`         | 页面和请求代码已准备，后端接口尚未部署         |
| 注销用户         | `/admin/users`         | 后端已有注销接口，但缺少用户列表，暂时无法操作 |

上述页面受 `src/admin/config.ts` 控制。
目前 `adminUsers`、`adminAnnouncements` 和 `statistics` 都是 `false`，
所以页面不会向不存在的接口发送请求，而是显示后端缺失提示。


## 页面和路由

| 路由                    | 页面      | 失物招领管理员 | 系统管理员 |
| `/admin/login`         | 管理员登录 | 可访问         | 可访问     |
| `/admin/dashboard`     | 数据总览   | 可访问         | 可访问     |
| `/admin/posts`         | 帖子审核   | 可访问         | 可访问     |
| `/admin/items`         | 物品状态   | 可访问         | 可访问     |
| `/admin/claims`        | 认领处理   | 可访问         | 可访问     |
| `/admin/announcements` | 公告管理   | 无权限         | 可访问     |
| `/admin/users`         | 用户管理   | 无权限         | 可访问     |
| `/admin/forbidden`     | 无权限提示 | 可访问         | 可访问     |

## 管理端目录
src/
├── api/
│   ├── http.ts                 # Axios、响应信封、Token、401 处理
│   └── admin.ts                # 管理端所有接口和接口路径
├── admin/
│   ├── AdminLayout.vue         # 管理端整体布局和侧边栏
│   ├── LoginView.vue           # 管理员登录
│   ├── DashboardView.vue       # 数据总览
│   ├── PostReviewView.vue      # 帖子审核
│   ├── ItemManageView.vue      # 物品状态
│   ├── ClaimManageView.vue     # 认领处理
│   ├── AnnouncementManageView.vue # 公告管理
│   ├── UserManageView.vue      # 用户管理
│   ├── ForbiddenView.vue       # 无权限页面
│   ├── auth.ts                 # 管理员登录状态
│   ├── config.ts               # 后端接口开关
│   ├── format.ts               # 日期和状态格式化
│   ├── style.css               # 管理端样式
│   └── types.ts                # 管理端数据类型
├── router/
│   └── index.ts                # 管理端路由和权限守卫
├── App.vue
└── main.ts

## 已对接的后端接口

前端请求前缀统一为：/api/v1

| 功能           | 接口                                        |
| 登录           | `POST /api/v1/auth/login`                 |
| 管理员资料     | `GET /api/v1/auth/profile`                |
| 帖子列表       | `GET /api/v1/posts`                       |
| 审核帖子       | `PATCH /api/v1/posts/:post_id/review`     |
| 修改帖子状态   | `PATCH /api/v1/admin/posts/:post_id/status` |
| 已删除帖子列表 | `GET /api/v1/admin/posts/deleted`         |

登录成功后会保存：
admin_token
admin_user

需要登录的请求会自动携带：
Authorization: Bearer <access_token>

接口返回统一使用：
{
  "code": 0,
  "msg": "success",
  "data": {}
}

###需要后端补齐的接口

### 认领管理
GET   /api/v1/admin/claims
PATCH /api/v1/admin/claims/:claim_id/review

学生端现有的 `/api/v1/conversations` 只返回当前用户参与的会话。
管理员读取别人会话的消息会返回403 无权参与该对话
因此学生端会话接口不能代替管理员全站认领管理。

### 用户管理
GET   /api/v1/admin/users
PATCH /api/v1/admin/users/:user_id/status
PATCH /api/v1/admin/users/:user_id/role

当前后端只有注销用户接口：DELETE /api/v1/admin/users/:user_id

### 公告管理
GET    /api/v1/announcements
POST   /api/v1/admin/announcements
PUT    /api/v1/admin/announcements/:announcement_id
PATCH  /api/v1/admin/announcements/:announcement_id/status
DELETE /api/v1/admin/announcements/:announcement_id

### 统计
GET /api/v1/admin/stats
当前统计页面暂时使用帖子列表的 `total` 计算总量、待审核、已通过和通过率。

## 本地运行

### 1. 环境要求
- Node.js 22 或更高版本
- 可以访问后端服务

### 2. 安装依赖
cd "lostfound-admin-clean"
npm install

### 3. 启动前端
npm run dev
浏览器打开：http://localhost:5173/admin/login

### 4. 后端地址
开发环境中，复制：
.env.development.example
为：
.env.development
然后填写本机能够访问的后端地址：
VITE_PROXY_TARGET=http://后端地址:端口

`.env.development` 已加入 `.gitignore`，不会上传到仓库。
提交到 GitHub 的只有不包含真实 IP 的 `.env.development.example`。

## 测试账号
失物招领管理员：00000000 / 123456789
系统管理员：00000001 / 123456789

## 验证命令
npm run type-check
npm run build

当前两条命令均已通过。生产构建文件输出到：
dist/

部署时需要将 `/admin/...` 路由回退到 `index.html`。

## 管理员使用学生端
管理员可以登录学生端并使用发帖和评论功能。后端对管理员发帖的规则是：
student 发帖后状态为 pending
postadmin 发帖后状态为 approved
mainadmin 发帖后状态为 approved

管理员在学生端点击“发布信息”，填写标题、地点、描述和图片后提交，
帖子会直接发布，不需要再次审核。