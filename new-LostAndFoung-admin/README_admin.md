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
  -> 修改帖子完成状态
  -> 管理评论
  -> 查看和恢复已删除帖子
  -> 查看和审核意见反馈
  -> 审核用户申诉
  -> 查看统计图表
  -> 新建和删除公告
  -> 注销和恢复用户

当前后端已经开放并可用的接口：
登录、管理员资料、帖子列表、帖子审核、帖子状态修改
已删除帖子列表、恢复帖子
按帖子查询评论、删除评论
修改帖子完成状态、待审核列表
意见反馈列表和审核
学生端公开公告查询、管理员新建和删除公告
管理员完整统计、用户注销和恢复

当前存在以下后端缺口：
公告没有编辑、撤回和草稿功能；创建即发布。（此为说明）
公告接口暂不支持手绘图片，手绘功能保留为后续扩展。
用户模块没有列表、启用/禁用和修改角色接口。

当前后端能力开关见 `src/admin/config.ts`。

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
- 修改帖子完成状态
- 管理评论
- 查看和恢复已删除帖子

### 系统管理员

系统管理员在项目权限设计中拥有失物招领管理员的全部权限，另外还应当可以
管理账号、修改角色、启用或禁用用户、管理公告、查看意见反馈和查看全校统计。

下面是当前代码与后端部署的真实状态：
| 目标权限         | 前端入口                 | 当前状态                                    |
| 查看全校数据统计  | `/admin/dashboard`     | 已完成，调用 `/admin/count`                  |
| 管理公告         | `/admin/announcements` | 两类管理员均可查询、新建和删除，不支持编辑和撤回 |
| 管理账号         | `/admin/users`         | 只能输入用户编号进行注销和恢复                 |
| 修改用户角色      | `/admin/users`         | 后端没有接口                                 |
| 启用或禁用用户    | `/admin/users`         | 后端没有接口                                 |
| 查看意见反馈      | `/admin/feedbacks`     | 已完成列表、通过和拒绝                        |
| 审核用户申诉      | `/admin/appeals`       | 已完成列表、通过和拒绝                        |

## 页面和路由
| 路由                    | 页面      | 失物招领管理员 | 系统管理员 |
| `/admin/login`         | 管理员登录 | 可访问         | 可访问     |
| `/admin/dashboard`     | 数据总览   | 可访问         | 可访问     |
| `/admin/posts`         | 帖子审核   | 可访问         | 可访问     |
| `/admin/items`         | 物品状态   | 可访问         | 可访问     |
| `/admin/comments`      | 评论管理   | 可访问         | 可访问     |
| `/admin/deleted-posts` | 已删除帖子 | 可访问         | 可访问     |
| `/admin/announcements` | 公告管理   | 可访问         | 可访问     |
| `/admin/users`         | 用户管理   | 无权限         | 可访问     |
| `/admin/feedbacks`     | 意见反馈   | 无权限         | 可访问     |
| `/admin/appeals`       | 申诉审核   | 无权限         | 可访问     |
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
│   ├── BarChart.vue            # 普通 CSS 柱状图
│   ├── PostReviewView.vue      # 帖子审核
│   ├── ItemManageView.vue      # 物品状态
│   ├── CommentManageView.vue   # 评论管理
│   ├── DeletedPostView.vue     # 已删除帖子和恢复
│   ├── AnnouncementManageView.vue # 公告管理
│   ├── DrawingCanvas.vue       # 公告手绘
│   ├── UserManageView.vue      # 用户管理
│   ├── FeedbackManageView.vue  # 意见反馈
│   ├── AppealManageView.vue    # 申诉审核
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
| 修改完成状态   | `PATCH /api/v1/admin/posts/:post_id/finished` |
| 已删除帖子列表 | `GET /api/v1/admin/posts/deleted`         |
| 恢复帖子       | `PATCH /api/v1/posts/:post_id/recover`    |
| 系统管理员待审核聚合列表 | `GET /api/v1/admin/reviews`      |
| 帖子评论列表   | `GET /api/v1/posts/:post_id/comments`     |
| 删除评论       | `DELETE /api/v1/comments/:comment_id`     |
| 意见反馈列表   | `GET /api/v1/admin/feedbacks`             |
| 审核意见反馈   | `PATCH /api/v1/admin/feedbacks/:id/review` |
| 审核用户申诉   | `PATCH /api/v1/admin/appeals/:id/review`  |
| 公开公告列表   | `GET /api/v1/announcements`               |
| 新建公告       | `POST /api/v1/admin/announcements`        |
| 删除公告       | `DELETE /api/v1/admin/announcements/:id`  |
| 注销用户       | `DELETE /api/v1/admin/users/:user_id`     |
| 恢复用户       | `PATCH /api/v1/admin/users/:user_id/recover` |
| 全校统计       | `GET /api/v1/admin/count`                 |

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

### 认领处理说明
认领由帖子发布者和申领者处理，不由管理员审核。
管理员可以直接修改帖子的完成状态：

### 用户管理
没有用户列表、修改角色和启用/禁用功能。

### 公告管理
当前接口：
GET    /api/v1/announcements
POST   /api/v1/admin/announcements
DELETE /api/v1/admin/announcements/:announcement_id

创建公告请求：
```json
{
  "title": "标题",
  "content": "内容"
}

没有草稿、编辑和撤回接口。
公告创建后立即发布，删除使用软删除。

### 统计
GET /api/v1/admin/count

返回用户总数、帖子总数、待审核帖子数、待处理申诉数、今日新帖和今日评论。

数据总览还会根据帖子列表生成失物/招领、审核状态、最近 7 天发布量和热门地点图表。

## 本地运行

### 1. 环境要求
- Node.js 22 或更高版本
- 可以访问后端服务

### 2. 安装依赖
cd "new-LostAndFoung-admin"
npm install

### 3. 启动前端
npm run dev
浏览器打开：http://localhost:5173/admin/login

### 4. 后端地址
开发环境中，复制：.env.development.example为：.env.development
然后填写本机能够访问的后端地址：VITE_PROXY_TARGET=http://后端地址:端口

`.env.development` 已加入 `.gitignore`，不会上传到仓库。
提交到 GitHub 的只有不包含真实 IP 的 `.env.development.example`。

## 测试账号
账号与密码属于敏感信息，不写入公开仓库，请向项目负责人获取。
（说明：管理员账号能直接进后台审批帖子、公告与反馈，明文写进公开 README
等于把后台入口连同钥匙一起挂出去，任何人都能登录操作。）

## 验证命令
npm run type-check
npm run build

当前两条命令均已通过。生产构建文件输出到：dist/

部署时需要将 `/admin/...` 路由回退到 `index.html`。

## 管理员使用学生端
管理员可以登录学生端并使用发帖和评论功能。后端对管理员发帖的规则是：
student 发帖后状态为 pending
postadmin 发帖后状态为 approved
mainadmin 发帖后状态为 approved

管理员在学生端点击“发布信息”，填写标题、地点、描述和图片后提交，
帖子会直接发布，不需要再次审核。
