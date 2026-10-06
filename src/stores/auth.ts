import { computed, ref } from 'vue'
import { login as loginApi, getCurrentUser } from '@/api/auth'
import type { User } from '@/types'

const user = ref<User | null>(null)

// 用 localStorage 保留登录状态。真实项目中通常保存后端返回的 token。
const savedUser = localStorage.getItem('campus-user')
const savedToken = localStorage.getItem('campus-token')
if (savedUser && savedToken) {
  try {
    user.value = JSON.parse(savedUser) as User
  } catch {
    localStorage.removeItem('campus-user')
  }
} else if (!savedToken) {
  localStorage.removeItem('campus-user')
}

window.addEventListener('auth-expired', () => {
  user.value = null
})

export function useAuth() {
  // computed 会根据 user 自动计算结果；user 改变时，isLoggedIn 也会自动更新。
  const isLoggedIn = computed(() => user.value !== null && Boolean(localStorage.getItem('campus-token')))

  async function login(studentNo: string, password: string) {
    // await 等待登录接口返回用户信息。
    const result = await loginApi(studentNo, password)
    user.value = result.user
    localStorage.setItem('campus-token', result.accessToken)
    localStorage.setItem('campus-user', JSON.stringify(user.value))
  }

  async function refreshUser() {
    if (!user.value) return
    user.value = await getCurrentUser()
    localStorage.setItem('campus-user', JSON.stringify(user.value))
  }

  function logout() {
    // 清空内存中的用户，同时清理浏览器保存的登录数据。
    user.value = null
    localStorage.removeItem('campus-token')
    localStorage.removeItem('campus-user')
  }

  // 组件通过 useAuth() 拿到这些状态和方法。
  return { user, isLoggedIn, login, refreshUser, logout }
}
