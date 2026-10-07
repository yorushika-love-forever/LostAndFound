/**
 * 注册页 —— 对应路由 /register，公开页面（未登录即可访问）。
 * 表单收集学号、姓名、密码、确认密码，先在前端做校验，
 * 通过后调用 api/auth 的 register()，即请求后端 POST /api/v1/auth/register。
 * 注册接口只创建账号、不返回 token，所以成功后不自动登录，
 * 而是跳回登录页并带上 query.registered=1，让登录页显示“注册成功”的提示。
 */
<script setup lang="ts">
// reactive 把表单对象变成响应式；ref 用来存单个状态（loading / errorMessage）。
import { reactive, ref } from 'vue'
// useRouter 拿到路由器，注册成功后用它跳转到登录页。
import { useRouter } from 'vue-router'
// register 是对 POST /api/v1/auth/register 的封装。
import { register } from '@/api/auth'

// 路由器实例，用于注册成功后的编程式跳转。
const router = useRouter()
// 表单数据：4 个字段分别对应模板里 4 个输入框的 v-model 绑定。
const form = reactive({ username: '', name: '', password: '', confirmPassword: '' })
// 请求进行中的标志，用于禁用按钮、防止重复提交。
const loading = ref(false)
// 错误提示文案，空字符串表示无错误。
const errorMessage = ref('')

/**
 * 提交注册表单的处理函数。
 * 触发时机：点击“创建账号”按钮，或在输入框内回车触发 @submit。
 * 先在本地做三项校验（学号纯数字、密码 8-16 位、两次密码一致），任一失败即 return 并给出提示，
 * 避免明显不合法的数据白白发一次请求；全部通过后才调 register() 请求 POST /api/v1/auth/register。
 * 成功后跳转到 /login?registered=1；失败则把后端返回的错误信息展示出来。
 */
async function submit() {
  // 每次提交先清空旧错误，保证提示只对应最近一次操作。
  errorMessage.value = ''
  // 校验一：学号必须是纯数字。trim() 去掉首尾空格，/^\d+$/ 要求整串都是数字。
  if (!/^\d+$/.test(form.username.trim())) {
    // 前端校验不通过时直接结束，不发起网络请求，减少无谓的后端压力。
    errorMessage.value = '学号只能填写数字'
    return
  }
  // 校验二：密码长度必须为 8-16 位（与后端规则保持一致）。
  if (form.password.length < 8 || form.password.length > 16) {
    errorMessage.value = '密码长度需要为 8-16 位'
    return
  }
  // 校验三：两次输入的密码必须相同，避免用户输错导致之后无法登录。
  if (form.password !== form.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  // 三项校验都通过，才真正开始请求；置 loading 禁用按钮防重复提交。
  loading.value = true
  try {
    // 调后端创建账号；注册接口成功后只返回用户信息，不返回 token。
    await register(form.username, form.name, form.password)
    // 注册成功不自动登录，而是跳回登录页，并用 query 携带 registered=1 作为“刚注册成功”的标记：
    // 地址栏会变成 /login?registered=1，登录页据此显示提示。
    await router.push({ path: '/login', query: { registered: '1' } })
  } catch (error) {
    // 后端 code !== 0 时 request() 会抛出 Error(msg)，所以优先取 error.message 展示后端提示。
    errorMessage.value = error instanceof Error ? error.message : '注册失败'
  } finally {
    // 成功或失败都要复位 loading，否则按钮会一直处于禁用状态。
    loading.value = false
  }
}
</script>

<template>
  <!-- 与登录页共用 auth-layout 布局：左侧宣传 + 右侧表单。 -->
  <section class="auth-layout">
    <!-- 左侧纯展示的宣传区。 -->
    <div class="auth-intro"><p class="eyebrow">JOIN THE CAMPUS</p><h1>创建你的<br /><em>校园账号。</em></h1><p>注册后即可发布线索、参与认领并和失主安全沟通。</p></div>
    <!-- 注册表单主体：@submit.prevent 阻止浏览器默认提交刷新，改走 submit()。
         输入框上的 required / minlength / maxlength 只是浏览器层的初步限制，真正的校验以 submit() 为准。 -->
    <form class="panel auth-form" @submit.prevent="submit">
      <!-- 表单标题区。 -->
      <p class="eyebrow">NEW ACCOUNT</p><h2>注册找光</h2>
      <!-- 学号：inputmode="numeric" 让移动端弹出数字键盘（注意没写 type="number"，值仍是字符串）。 -->
      <label>学号<input v-model="form.username" required inputmode="numeric" maxlength="32" placeholder="请输入数字学号" /></label>
      <!-- 姓名：v-model 绑定 form.name。 -->
      <label>姓名<input v-model="form.name" required maxlength="32" placeholder="请输入真实姓名" /></label>
      <!-- 密码：type="password" 隐藏明文，minlength/maxlength 限制 8-16 位。 -->
      <label>密码<input v-model="form.password" required type="password" minlength="8" maxlength="16" placeholder="8-16 位密码" /></label>
      <!-- 确认密码：与密码分开绑定，前端会在 submit() 里比对两者是否一致。 -->
      <label>确认密码<input v-model="form.confirmPassword" required type="password" minlength="8" maxlength="16" placeholder="再次输入密码" /></label>
      <!-- 错误提示：errorMessage 非空时才渲染（v-if），{{ }} 插值输出文案。 -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <!-- 提交按钮：:disabled=loading 在请求期间禁用，文案随 loading 切换。 -->
      <button class="primary-button" :disabled="loading">{{ loading ? '注册中...' : '创建账号' }}</button>
      <!-- 底部返回登录链接：RouterLink 做前端路由跳转，不刷新页面。 -->
      <p class="form-tip">已有账号？<RouterLink to="/login" class="detail-link">返回登录</RouterLink></p>
    </form>
  </section>
</template>
