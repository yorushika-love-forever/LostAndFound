import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

// 给路由 meta 补充类型说明，这样在守卫里写 to.meta.title 也会有类型提示。
declare module 'vue-router' {
  interface RouteMeta {
    // 标记“这个页面必须登录后才能访问”
    requiresAuth?: boolean
    // 浏览器标签页标题
    title?: string
  }
}

// 没配置 title 时使用的默认标签页标题。
const DEFAULT_TITLE = '找光 · 校园失物招领'

// 从 query.redirect 中取出安全的站内路径，避免被构造成外部地址或 // 开头的协议相对地址。
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/home'
}

// 判断 JWT 是否仍然有效。
// 后端签发的 access_token 是 HS256 的 JWT，格式为 header.payload.signature，
// payload 用 base64url 编码，内含 exp（过期时间，单位秒）。解析失败或缺少 exp 一律按无效处理，
// 避免带着已经作废的 token 继续访问受保护页面。
function isTokenValid(token: string): boolean {
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    // base64url 与标准 base64 的差异：- 和 _ 需要还原，末尾通常缺少 = 补位。
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    // atob 返回的是二进制字符串，先转成百分号编码再解码，避免中文等非 ASCII 字符报错。
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    const { exp } = JSON.parse(json) as { exp?: number }
    return typeof exp === 'number' && exp * 1000 > Date.now()
  } catch {
    return false
  }
}

// createRouter 用来创建整个项目的路由管理器。
const router = createRouter({
  // createWebHistory 使用正常的 URL，例如 /home、/items/1。
  // 部署到服务器时需要服务器把这些路径都指向 index.html。
  history: createWebHistory(),//路由器的工作模式
  routes: [
    // redirect 表示访问根路径 / 时，自动跳到首页。
    { path: '/', redirect: '/home' },
    // import() 是动态导入：只有用户访问这个页面时，才加载对应的组件。
    // 公开页面不放 requiresAuth，登录和被限制登录的用户都能访问。
    { path: '/login', 
      component: () => import('@/views/user/LoginView.vue'), meta: { title: '登录' } },
    { path: '/register', 
      component: () => import('@/views/user/RegisterView.vue'), meta: { title: '注册' } },
    { path: '/appeal', 
      component: () => import('@/views/user/AppealView.vue'), meta: { title: '账号申诉' } },
    // meta 是路由附加信息。requiresAuth 用来标记“这个页面必须登录”。
    { path: '/home', 
      component: () => import('@/views/user/HomeView.vue'), meta: { requiresAuth: true, title: '浏览信息' } },
    { path: '/items/:id', 
      component: () => import('@/views/user/ItemDetailView.vue'), meta: { requiresAuth: true, title: '物品详情' } },
    { path: '/publish', 
      component: () => import('@/views/user/PublishView.vue'), meta: { requiresAuth: true, title: '发布信息' } },
    { path: '/mine', 
      component: () => import('@/views/user/MyView.vue'), meta: { requiresAuth: true, title: '我的记录' } },
    { path: '/profile', 
      component: () => import('@/views/user/ProfileView.vue'), meta: { requiresAuth: true, title: '个人资料' } },
    { path: '/conversations/:id', 
      component: () => import('@/views/user/ConversationView.vue'), meta: { requiresAuth: true, title: '认领沟通' } },
    // 兜底路由：必须放在最后，匹配前面所有没命中的地址，避免刷新或输错地址时白屏。
    { path: '/:pathMatch(.*)*', name: 'not-found',
      component: () => import('@/views/user/NotFoundView.vue'), meta: { title: '页面不存在' } },
  ],
})

// 路由守卫会在每次页面跳转前执行，常用于检查登录权限。
router.beforeEach((to) => {
  const auth = useAuth()
  const token = localStorage.getItem('campus-token')

  // 本地存了 token，但它已经过期或无法解析：先清空登录态，
  // 否则会出现“界面以为已登录、接口却一直返回 401”的状态。
  if (token && !isTokenValid(token)) {
    auth.logout()
  }

  // 已登录的用户再次访问登录页时，直接送回他原本想去的地方（默认首页）。
  if (to.path === '/login' && auth.isLoggedIn.value) {
    return safeRedirect(to.query.redirect)
  }

  // 目标页面需要登录、但当前未登录：带上原始目标地址，登录成功后可以跳回。
  if (to.meta.requiresAuth && !auth.isLoggedIn.value) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

// 每次跳转完成后同步浏览器标签页标题。
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 找光` : DEFAULT_TITLE
})

export default router
