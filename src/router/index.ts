/**
 * router/index.ts —— 前端路由表 + 路由守卫（本项目导航与权限的核心）。
 * 负责两件事：① 声明 URL 与页面组件的映射（含懒加载、标题、是否需要登录）；
 *            ② 通过守卫在每次跳转前后做登录校验，并同步浏览器标签页标题。
 * 被谁用：main.ts 通过 app.use(router) 安装；组件里用 useRoute() / useRouter() 消费。
 * 依赖：vue-router、@/stores/auth（读取登录态）。
 * 对外：默认导出 router 实例，并具名导出 safeRedirect 供登录等模块复用。
 */
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

/**
 * 从 query.redirect 中取出「安全的站内路径」。
 * 登录跳转时 URL 上会带 ?redirect=<原地址>，好在登录成功后跳回原处，因此需要读取它。
 * 但它来自 URL、可被用户伪造，若直接拿来跳转就会产生「开放重定向」风险，所以必须过滤：
 *   - 必须是 string；
 *   - 必须以单个 '/' 开头（站内绝对路径）；
 *   - 不能以 '//' 开头——'//evil.com' 会被浏览器当作「协议相对地址」跳到外站，
 *     这是开放重定向最常见的绕过手法，必须显式排除。
 * 任一条件不满足，就回退到默认首页 '/home'。
 * @param value 来自路由 query 的未知值（类型不可信，故用 unknown）
 * @returns 安全的站内路径字符串
 */
// 从 query.redirect 中取出安全的站内路径，避免被构造成外部地址或 // 开头的协议相对地址。
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/home'
}

// 判断 JWT 是否仍然有效。
// 后端签发的 access_token 是 HS256 的 JWT，格式为 header.payload.signature，
// payload 用 base64url 编码，内含 exp（过期时间，单位秒）。解析失败或缺少 exp 一律按无效处理，
// 避免带着已经作废的 token 继续访问受保护页面。
// 补充：这里只做「本地过期判断」来优化体验，token 的合法性最终仍由后端校验；
// 之所以前端也判一次，是为了避免出现「界面以为已登录、接口却全返回 401」的错乱状态。
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
    // exp 单位是秒，乘 1000 转成毫秒再与当前时间比较，判断是否过期。
    return typeof exp === 'number' && exp * 1000 > Date.now()
  } catch {
    // 解码或 JSON 解析失败，说明 token 已损坏，一律视为无效。
    return false
  }
}

// createRouter 用来创建整个项目的路由管理器。
const router = createRouter({
  // createWebHistory 使用正常的 URL，例如 /home、/items/1。
  // 部署到服务器时需要服务器把这些路径都指向 index.html。
  history: createWebHistory(),//路由器的工作模式
  // routes 是路由表：一条记录代表「某个 URL 由哪个组件渲染」。
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
    // 公告页刻意不设 requiresAuth：后端 /announcements 是公开接口，未登录也应能查看公告。
    { path: '/announcements',
      component: () => import('@/views/user/AnnouncementView.vue'), meta: { title: '全站公告' } },
    // :id 是动态路由参数，例如访问 /items/8 时，组件里可用 route.params.id 取到 '8'。
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
// 返回值的含义：什么都不返回（undefined）表示「放行」；返回字符串或 { path, query } 对象表示「改道」。
router.beforeEach((to) => {
  const auth = useAuth()
  const token = localStorage.getItem('campus-token')

  // 本地存了 token，但它已经过期或无法解析：先清空登录态，
  // 否则会出现“界面以为已登录、接口却一直返回 401”的状态。
  if (token && !isTokenValid(token)) {
    auth.logout()
  }

  // 已登录的用户再次访问登录页时，直接送回他原本想去的地方（默认首页）。
  // 这里用 safeRedirect 过滤 redirect，防止被恶意拼成外站地址造成开放重定向。
  if (to.path === '/login' && auth.isLoggedIn.value) {
    return safeRedirect(to.query.redirect)
  }

  // 目标页面需要登录、但当前未登录：带上原始目标地址，登录成功后可以跳回。
  // 用 to.fullPath 而不是 to.path，因为 fullPath 还包含 query（如 /items/1?tab=2），跳回时不会丢参数。
  if (to.meta.requiresAuth && !auth.isLoggedIn.value) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

// 每次跳转完成后同步浏览器标签页标题。
// afterEach 在导航确认完成（新页面即将渲染）后触发，此时改 document.title 最稳妥。
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 找光` : DEFAULT_TITLE
})

export default router
