/**
 * 登录页 —— 对应路由 /login，是公开页面（路由 meta 里没有 requiresAuth，未登录也能访问）。
 * 页面职责：收集学号 + 密码，调用 stores/auth 的 login()，它内部会请求后端 POST /api/v1/auth/login，
 * 成功拿到 access_token 和用户信息并写入全局登录态；随后再跳回用户原本想去的页面。
 * 失败时把后端返回的 msg 显示在表单里（后端信封 code !== 0 时 request() 会抛出 Error）。
 * 典型进入方式：① 直接访问 /login；② 被路由守卫从受保护页面重定向到 /login?redirect=<原地址>。
 */
<script setup lang="ts">
// reactive / ref 都是 Vue 3 组合式 API 的响应式工具：ref 包裹单个值（读写要 .value），reactive 包裹对象（直接读写属性）。
import { reactive, ref } from 'vue'
// useRoute 读取当前路由信息（这里用来拿 query.redirect）；useRouter 拿到路由器对象用于主动跳转。
import { useRoute, useRouter } from 'vue-router'
// useAuth 是项目封装的登录状态模块，这里只取其中的 login 方法。
import { useAuth } from '@/stores/auth'
// safeRedirect 是路由模块导出的工具函数，用来校验并取出安全的站内跳转地址。
import { safeRedirect } from '@/router'

// 路由器实例，后面用 router.push 主动跳页。
const router = useRouter()
// 当前路由对象，用来读取 URL 上的查询参数，如 ?redirect=/mine。
const route = useRoute()
// 解构出 login 方法（等价于 const login = useAuth().login）。
const { login } = useAuth()
// 表单数据用 reactive 包成响应式对象，模板里 v-model 会与这些字段双向绑定。
const form = reactive({ studentNo: '', password: '' })
// loading 表示“正在请求登录接口”，用来禁用按钮、显示“登录中...”，防止用户重复点击提交。
const loading = ref(false)
// errorMessage 存放要展示给用户的错误文案，空字符串表示当前没有错误。
const errorMessage = ref('')

/**
 * 提交登录表单的处理函数。
 * 触发时机：用户在输入框回车，或点击“进入系统”按钮时触发 @submit。
 * 流程：置 loading → 调用 login() 请求 POST /api/v1/auth/login →
 *      成功后用 safeRedirect 解析目标地址并 router.push 回原页面；
 *      失败时把错误信息写入 errorMessage。
 * 返回值：无（async 函数返回 Promise，模板并不使用它的结果）。
 */
async function submit() {
  // 进入请求前先置 loading，让按钮立即变灰，避免用户连点造成重复提交。
  loading.value = true
  // 清空上一次的错误提示，保证界面只显示最新一次提交的结果。
  errorMessage.value = ''
  try {
    // await 等待登录完成；login() 内部成功后会写入 token 和用户信息到全局状态。
    await login(form.studentNo, form.password)
    // 登录前被守卫拦下的目标地址会放在 query.redirect 里，登录成功后跳回去。
    // 这里不直接跳首页，是因为用户可能本来想访问 /mine 等页面，跳回去体验更好。
    // 用 safeRedirect 而不是直接用 route.query.redirect：query 的值可能是外部地址
    // 或 // 开头的协议相对地址，直接跳转有安全风险；safeRedirect 只放行以 / 开头的站内路径，否则回首页。
    await router.push(safeRedirect(route.query.redirect))
  } catch (error) {
    // request() 在业务失败（code !== 0）时抛出的是 Error，其 message 就是后端的 msg，
    // 因此优先取 error.message；万一抛出的不是 Error，则退回默认文案。
    errorMessage.value = error instanceof Error ? error.message : '登录失败'
  } finally {
    // 无论成功还是失败都要关闭 loading，保证按钮可再次点击。
    loading.value = false
  }
}
</script>

<template>
  <!-- auth-layout 是项目统一样式：登录/注册/申诉这类页面共用的“左宣传 + 右表单”栅格布局。 -->
  <section class="auth-layout">
    <!-- 左侧宣传区，纯展示、无逻辑，窄屏下通常会被 CSS 隐藏。 -->
    <div class="auth-intro"><p class="eyebrow">CAMPUS LOST & FOUND</p><h1>让每一件遗失物<br /><em>回到它的主人身边。</em></h1><p>在校园里寻找线索，也把偶然拾到的物品交给正确的人。</p></div>
    <!-- 表单主体：@submit.prevent 监听表单提交并阻止浏览器默认的整页刷新，改为调用 submit()。 -->
    <form class="panel auth-form" @submit.prevent="submit">
      <!-- 表单标题区。 -->
      <p class="eyebrow">WELCOME BACK</p><h2>登录找光</h2>
      <!-- 注册页跳过来时会带上 ?registered=1；v-if 判断为真才渲染该提示，否则整个节点不存在。 -->
      <p v-if="route.query.registered" class="success-message">注册成功，请使用新账号登录。</p>
      <!-- 学号输入框：v-model 双向绑定 form.studentNo，输入内容会实时写回数据对象。 -->
      <label>学号<input v-model="form.studentNo" required inputmode="numeric" placeholder="请输入学号" /></label>
      <!-- 密码输入框：type="password" 让内容以圆点显示，避免明文暴露；required 是浏览器层的必填校验。 -->
      <label>密码<input v-model="form.password" required minlength="8" type="password" placeholder="请输入密码（8-16 位）" /></label>
      <!-- 错误提示：只有 errorMessage 非空时才渲染；{{ }} 是插值语法，把变量内容显示到页面上。 -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <!-- 提交按钮：:disabled（v-bind 的简写）绑定 loading，请求期间禁用防止重复提交，文案也随 loading 切换。 -->
      <button class="primary-button" :disabled="loading">{{ loading ? '登录中...' : '进入系统' }}</button>
      <!-- 底部跳转链接：RouterLink 是 Vue Router 的组件式导航，点击切换路由但不刷新整页。 -->
      <p class="form-tip">还没有账号？<RouterLink to="/register" class="detail-link">立即注册</RouterLink> · <RouterLink to="/appeal" class="detail-link">账号申诉</RouterLink></p>
    </form>
  </section>
</template>
