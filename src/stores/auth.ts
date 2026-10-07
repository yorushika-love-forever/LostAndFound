/**
 * stores/auth.ts —— 全局登录状态管理（一个「手写 store」，本项目未引入 Pinia）。
 * 核心思路：把 user 定义在「模块顶层」。模块在整个应用中只会被加载一次，
 * 于是这个 ref 就成了所有组件共享的「单例状态」，任何组件调用 useAuth() 拿到的都是同一份。
 * 职责：登录、登出、刷新当前用户，并把登录信息同步到 localStorage，让刷新后仍能保持登录。
 * 被谁用：router 路由守卫、UserLayout、各业务页面通过 useAuth() 消费。
 * 依赖：@/api/auth（login、getCurrentUser）、@/types 的 User。
 * 对外：导出 useAuth()，返回 { user, isLoggedIn, login, refreshUser, logout }。
 */
import { computed, ref } from 'vue'
import { login as loginApi, getCurrentUser } from '@/api/auth'
import type { User } from '@/types'

// 模块级 ref：整个应用共享同一份「当前用户」状态（null 表示未登录）。
// 特意放在模块顶层而不是 useAuth() 内部——这样状态才是单例，能被所有组件共享。
const user = ref<User | null>(null)

// 用 localStorage 保留登录状态。真实项目中通常保存后端返回的 token。
// 下面是「应用启动时的状态恢复」：刷新页面会清空内存，需要从 localStorage 把登录信息读回来。
const savedUser = localStorage.getItem('campus-user')
const savedToken = localStorage.getItem('campus-token')
if (savedUser && savedToken) {
  try {
    user.value = JSON.parse(savedUser) as User
  } catch {
    // 存的 JSON 损坏时静默清掉，避免之后每次 JSON.parse 都抛异常。
    localStorage.removeItem('campus-user')
  }
} else if (!savedToken) {
  // token 已不存在，说明登录已失效，顺手清掉残留的用户信息，保持两者状态一致。
  localStorage.removeItem('campus-user')
}

// 监听 http.ts 在遇到 401 时广播的 auth-expired 事件：
// 只要后端判定 token 失效，就把内存里的用户置空，界面立刻回到未登录状态。
window.addEventListener('auth-expired', () => {
  user.value = null
})

/**
 * 登录态的「使用权柄」。它是一个工厂函数，每次调用都返回同一组状态和方法。
 * 之所以用函数包一层而不是直接导出变量，是为了统一入口，让取用方式统一为 useAuth()。
 * @returns user 当前用户（ref）；isLoggedIn 是否已登录（computed，可响应式）；
 *          login 账号密码登录；refreshUser 重新拉取当前用户；logout 登出。
 */
export function useAuth() {
  // computed 会根据 user 自动计算结果；user 改变时，isLoggedIn 也会自动更新。
  // 用 computed 而不是普通函数：它带缓存，且能被模板 / 守卫以响应式方式追踪依赖。
  // 两个条件都满足才算已登录——内存里有 user，且 localStorage 里有 token。
  const isLoggedIn = computed(() => user.value !== null && Boolean(localStorage.getItem('campus-token')))

  /**
   * 调用登录接口并保存登录态。
   * @param studentNo 学号
   * @param password 密码
   */
  async function login(studentNo: string, password: string) {
    // await 等待登录接口返回用户信息。
    // result 里既包含 user，也包含后端签发的 accessToken（JWT）。
    const result = await loginApi(studentNo, password)
    user.value = result.user
    localStorage.setItem('campus-token', result.accessToken)
    // 把 user 序列化存起来，供刷新后恢复；token 则用于后续请求的鉴权。
    localStorage.setItem('campus-user', JSON.stringify(user.value))
  }

  /**
   * 重新从后端拉取当前用户，用于资料被修改后同步最新信息。
   * 未登录（内存里没有 user）时直接返回，避免发一次注定失败的请求。
   */
  async function refreshUser() {
    if (!user.value) return
    user.value = await getCurrentUser()
    localStorage.setItem('campus-user', JSON.stringify(user.value))
  }

  /**
   * 登出：清空内存与 localStorage 中的登录信息。
   * 内存与本地存储必须同时清，否则会出现「界面显示已登录、接口却未带 token」的状态不同步。
   */
  function logout() {
    // 清空内存中的用户，同时清理浏览器保存的登录数据。
    user.value = null
    localStorage.removeItem('campus-token')
    localStorage.removeItem('campus-user')
  }

  // 组件通过 useAuth() 拿到这些状态和方法。
  // user / isLoggedIn 是 ref / computed，读取时需 .value；login 等是普通函数，可直接调用。
  return { user, isLoggedIn, login, refreshUser, logout }
}
