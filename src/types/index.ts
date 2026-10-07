/**
 * types/index.ts —— 全项目共享的 TypeScript 类型定义（只含类型，编译后不产生任何运行代码）。
 * 好处：把「后端返回的数据」和「前端要用的数据结构」集中声明，各处 import 后即可获得类型提示与检查。
 * 约定：大多数接口对应后端 /api/v1 的返回结构（字段与后端一一对应）；
 *       少数（如 ItemForm、ItemQuery）是前端为表单 / 查询参数自行组织的，并非后端直接返回。
 * 对外：导出若干 interface / type，供 api、stores、views、components 引用。
 */

// 物品大类：lost=失物（我丢了东西），found=拾物（我捡到了东西）。
export type ItemType = 'lost' | 'found'
// 审核状态：待审核 / 已通过 / 已驳回（由后端管理员审核后写入）。
export type ItemStatus = 'pending' | 'approved' | 'rejected'

/**
 * 失物 / 拾物信息条目（对应后端 items 资源，字段基本直接来自后端响应）。
 */
export interface LostItem {
  // 主键，后端自增生成
  id: number
  // 物品标题
  title: string
  // 类型：失物还是拾物
  type: ItemType
  // 详细描述
  description: string
  // 地点 id（对应 Location.id），用于按地点筛选
  locationId: string
  // 地点的可读名称（后端冗余返回，方便直接展示，省去再查一次）
  location: string
  // 补充说明（可选内容，未填时可能为空串）
  supplement: string
  // 图片地址（后端返回的完整 URL）
  imageUrl: string
  // 审核状态（取值见 ItemStatus：pending / approved / rejected）
  status: ItemStatus
  // 是否已完成（物品已物归原主）
  isFinished: boolean
  // 发布者的用户 id
  publisherId: number
  // 发布者昵称（后端冗余返回，列表可直接展示）
  publisherName: string
  // 创建时间（ISO 字符串，展示前用 formatDate 转换）
  createdAt: string
  // 更新时间（同为字符串形式）
  updatedAt: string
}

/**
 * 认领申请：某个用户对某件物品提出的认领请求。
 */
export interface ClaimApplication {
  // 申请主键
  id: number
  // 关联的物品 id
  itemId: number
  // 物品标题（冗余返回，便于「我的认领」列表直接展示，无需再查物品）
  itemTitle: string
  // 认领理由
  reason: string
  // 申请状态：待处理 / 进行中（相对物品详情页而言的简化状态）
  status: 'pending' | 'active'
  // 提交时间
  createdAt: string
}

/**
 * 物品下的评论。
 */
export interface Comment {
  // 评论主键
  id: number
  // 所属物品 id（后端字段名为 postId，语义上就是物品）
  postId: number
  // 评论者用户 id
  userId: number
  // 评论者昵称（冗余返回，直接用于展示）
  authorName: string
  // 评论正文
  content: string
  // 发表时间
  createdAt: string
}

/**
 * 会话：两个用户围绕同一件物品建立的一对一沟通。
 */
export interface Conversation {
  // 会话主键
  id: number
  // 关联的物品 id
  postId: number
  // 发起方用户 id
  initiatorId: number
  // 物品发布者用户 id
  ownerId: number
  // 帖子标题快照：后端按 postId 实时回填（非数据库字段），帖子已删除时为空串。
  // 有了它，聊天页与「我的认领」列表不必再额外请求帖子详情就能显示标题。
  postTitle: string
  // 帖子审核状态快照（帖子已删除时为空串）
  postStatus: ItemStatus | ''
  // 帖子是否已完成：聊天页据此隐藏「申请完成寻找」入口，避免重复发起
  postIsFinished: boolean
  // 创建时间
  createdAt: string
  // 最近更新时间（有新消息时会刷新，常用于排序）
  updatedAt: string
}

// 会话中「标记已完成」请求的状态：待对方同意 / 已同意 / 已拒绝。
export type FinishRequestStatus = 'pending' | 'agreed' | 'rejected'

/**
 * 结束会话（确认物品已归还）的请求，需要会话另一方同意才生效。
 */
export interface FinishRequest {
  // 请求主键
  id: number
  // 所属会话 id
  conversationId: number
  // 发起方用户 id
  requesterId: number
  // 请求状态
  status: FinishRequestStatus
  // 创建时间
  createdAt: string
  // 更新时间
  updatedAt: string
}

/**
 * 当前登录用户。
 */
export interface User {
  // 用户主键
  id: number
  // 昵称（登录后顶栏展示的就是它）
  name: string
  // 学号（登录账号）
  studentNo: string
  // 角色：学生 / 物品管理员 / 总管理员，前端据此控制可见功能
  role: 'student' | 'postadmin' | 'mainadmin'
}

/**
 * 物品列表的查询条件（前端自行组织，用于拼接口的 query 参数）。
 */
export interface ItemQuery {
  // 关键词，可选
  keyword?: string
  // 类型筛选；'' 表示不限（用空串而不是 undefined，便于与下拉框绑定）
  type?: ItemType | ''
  // 地点筛选
  location?: string
  // 是否只看已完成
  finished?: boolean
}

/**
 * 发布 / 编辑物品的表单模型（前端自行定义，与后端字段不完全一致）。
 * 注意 image 是 File 对象而非 URL——提交前需要构造成 FormData 上传文件。
 */
export interface ItemForm {
  // 标题
  title: string
  // 类型
  type: ItemType
  // 描述
  description: string
  // 地点 id
  locationId: string
  // 补充说明
  supplement: string
  // 待上传的图片文件；未选择时为 null
  image: File | null
}

/**
 * 地点（如某教学楼、食堂），用于发布时选择位置及地图展示。
 */
export interface Location {
  // 地点 id（后端用字符串）
  id: string
  // 地点名称
  name: string
  // 纬度
  latitude: number
  // 经度
  longitude: number
}

/**
 * 按校区归类的地址分组，用于发布页「先选校区、再选地点」的联动下拉。
 */
export interface LocationGroup {
  // 校区名
  campus: string
  // 该校区下的地点列表
  locations: Location[]
}

/**
 * 全站公告（由管理员发布，所有人可见，未登录也能查看）。
 */
export interface Announcement {
  // 公告主键
  id: number
  // 公告标题
  title: string
  // 公告正文
  content: string
  // 发布管理员姓名（后端按 admin_id 关联用户表回填，直接展示；缺失时为 undefined）
  authorName?: string
  // 发布时间
  createdAt: string
}
