/**
 * 404 兜底页 —— 对应路由 /:pathMatch(.*)*（放在路由表最后，匹配所有没命中的地址），公开页面。
 * 用户访问了不存在的地址、或页面刷新后路由对不上时显示，避免整页白屏。
 * 页面会回显出错的具体地址，并根据是否登录决定按钮文案与跳转目标（去登录 / 返回首页）。
 * 本页不调用任何后端接口。
 */
<script setup lang="ts">
// useRoute 读当前路由（用来显示用户输错的完整地址）；useRouter 用于按钮点击后的跳转。
import { useRoute, useRouter } from 'vue-router'
// useAuth 提供全局登录状态，这里用它判断该显示“返回首页”还是“去登录”。
import { useAuth } from '@/stores/auth'

// 当前路由对象，模板里用 route.fullPath 展示包含查询参数的完整路径。
const route = useRoute()
// 路由器实例，供 goBack() 做编程式跳转。
const router = useRouter()
// 解构出 isLoggedIn（一个 computed，会随登录状态自动更新）。
const { isLoggedIn } = useAuth()

/**
 * 处理“返回”按钮的点击。
 * 触发时机：用户点击页面上的 primary-button。
 * 逻辑：已登录就回首页 /home，未登录则去登录页 /login——
 *      因为未登录直接回首页会立刻被路由守卫弹回登录页，不如直接送他去登录。
 */
function goBack() {
  // 在 <script> 里访问 ref/computed 要用 .value 取值（模板里则会自动解包，不用写 .value）。
  router.push(isLoggedIn.value ? '/home' : '/login')
}
</script>

<template>
  <!-- 与其它认证类页面共用 auth-layout 布局。 -->
  <section class="auth-layout">
    <!-- 左侧纯展示宣传区。 -->
    <div class="auth-intro"><p class="eyebrow">404 NOT FOUND</p><h1>这个页面<br /><em>也走丢了。</em></h1><p>你访问的地址不存在，或者对应的内容已经被移除。</p></div>
    <!-- 右侧提示面板：回显错误地址，并提供一个返回按钮。 -->
    <div class="panel auth-form">
      <!-- 标题区。 -->
      <p class="eyebrow">LOST & FOUND</p><h2>页面不存在</h2>
      <!-- 把用户访问的完整路径回显出来，方便核对是否输错地址（fullPath 含查询参数）。 -->
      <p class="page-lead">请检查地址是否正确：{{ route.fullPath }}</p>
      <!-- 按钮：@click 绑定 goBack()；文案用三元表达式按登录状态切换（模板里 isLoggedIn 会自动解包成布尔值）。 -->
      <button class="primary-button" @click="goBack">{{ isLoggedIn ? '返回首页' : '去登录' }}</button>
    </div>
  </section>
</template>
