/**
 * ProfileView.vue —— 个人资料页（路由 /profile）
 *
 * 页面作用：展示并修改个人资料、修改登录密码、提交意见反馈、注销账号，共四个表单/区块。
 *
 * 依赖接口：updateProfile 改资料、updatePassword 改密码、submitFeedback 提交反馈、
 *          deactivateAccount 注销账号；通过 useAuth() 拿到当前用户 user 及 refreshUser / logout 方法。
 * 主要交互：保存资料（成功后刷新全局用户）、修改密码（成功后清空输入框）、
 *          提交反馈（成功后清空输入框并提示）、注销账号（二次确认后调用接口，成功则清空登录态并跳回登录页）。
 */
<script setup lang="ts">
// reactive 用于创建对象形式的响应式数据（适合配合表单 v-model 使用）；ref 用于单个值。
import { reactive, ref } from 'vue'
// useRouter 用于编程式跳转（注销成功后跳 /login）。
import { useRouter } from 'vue-router'
// 账号相关接口：资料更新 / 密码修改 / 账号注销。
import { deactivateAccount, updatePassword, updateProfile } from '@/api/auth'
// 反馈接口：把用户填写的正文提交给后端（POST /feedbacks）。
import { submitFeedback } from '@/api/feedbacks'
// 全局登录态：user 当前用户；refreshUser 重新拉取用户信息；logout 清空登录态。
import { useAuth } from '@/stores/auth'

const router = useRouter()
const { user, refreshUser, logout } = useAuth()
// 资料表单：用当前用户信息预填（user 可能为 null，故用可选链 + 兜底空串）。
// 注意后端字段 studentNo 在表单里叫 username（学号）。
const profile = reactive({ name: user.value?.name || '', username: user.value?.studentNo || '' })
// 密码表单：三个字段都由 v-model 双向绑定，提交后清空。
const password = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
// 反馈表单：只有一个正文字段，同样由 v-model 绑定，提交成功后清空。
const feedback = reactive({ content: '' })
// 各表单各自的成功提示，以及所有操作共用的错误提示。
const profileMessage = ref('')
const passwordMessage = ref('')
const feedbackMessage = ref('')
const errorMessage = ref('')
// 各表单各自的提交中状态，用于禁用按钮并显示“保存中.../修改中.../提交中...”。
const profileLoading = ref(false)
const passwordLoading = ref(false)
const feedbackLoading = ref(false)

/**
 * 保存个人资料。
 * 触发方式：提交“基本资料”表单（@submit.prevent="saveProfile"）。
 * 先清空旧提示并置 loading，调用 updateProfile 更新，再 refreshUser 重新拉取并写入全局登录态，
 * 这样导航栏等处的用户名也会同步更新。失败写入 errorMessage，最后在 finally 关闭 loading。
 */
async function saveProfile() {
  profileMessage.value = ''; errorMessage.value = ''; profileLoading.value = true
  try { await updateProfile({ name: profile.name, username: profile.username }); await refreshUser(); profileMessage.value = '资料已更新' }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '资料更新失败' }
  finally { profileLoading.value = false }
}

/**
 * 修改登录密码。
 * 触发方式：提交“修改密码”表单（@submit.prevent="savePassword"）。
 * 直接把 password 对象（含旧/新/确认密码）交给后端校验；成功后清空三个输入框，
 * 并提示牢记新密码。失败写入 errorMessage，最后关闭 loading。
 * 注意：改密码成功不强制退出登录，仍使用原有登录态。
 */
async function savePassword() {
  passwordMessage.value = ''; errorMessage.value = ''; passwordLoading.value = true
  try { await updatePassword(password); password.oldPassword = ''; password.newPassword = ''; password.confirmPassword = ''; passwordMessage.value = '密码修改成功，请牢记新密码' }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '密码修改失败' }
  finally { passwordLoading.value = false }
}

/**
 * 提交意见反馈。
 * 触发方式：提交“意见反馈”表单（@submit.prevent="sendFeedback"）。
 * 成功后清空输入框并提示；提交人由后端从登录令牌识别，前端不需要传用户信息。
 * 失败写入 errorMessage，最后在 finally 关闭 loading 恢复按钮。
 */
async function sendFeedback() {
  // 先 trim 再判空：防止用户只输入空格也能通过表单的 required 校验。
  if (!feedback.content.trim() || feedbackLoading.value) return
  feedbackMessage.value = ''; errorMessage.value = ''; feedbackLoading.value = true
  try { await submitFeedback(feedback.content); feedback.content = ''; feedbackMessage.value = '反馈已提交，感谢你的建议' }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '反馈提交失败' }
  finally { feedbackLoading.value = false }
}

/**
 * 注销账号。
 * 触发方式：点击“注销我的账号”按钮（type="button"，不会触发表单提交）。
 * 先二次确认；成功后调用 deactivateAccount 软删除账号，
 * 再 logout() 清空内存与 localStorage 里的登录态，并 router.push 跳回登录页——
 * 因为账号已注销、token 已失效，必须离开受保护页面，否则后续请求都会 401。
 * 失败写入 errorMessage。
 */
async function deleteAccount() {
  if (!window.confirm('注销后账号和自己发布的内容将被软删除，确定继续吗？')) return
  try { await deactivateAccount(); logout(); await router.push('/login') }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '账号注销失败' }
}
</script>

<template>
  <!-- 页面根容器：标题区 + 全局错误提示 + 三个表单/区块 -->
  <section class="form-page">
    <div class="section-heading"><div><p class="eyebrow">MY PROFILE</p><h1>个人资料</h1><p class="page-lead">管理你的账号信息和安全设置。</p></div></div>
    <!-- 全局错误提示：三个操作共用同一个 errorMessage，任意一个失败都显示在这里 -->
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <!-- 基本资料表单：@submit.prevent 阻止默认刷新后调用 saveProfile；输入框用 v-model 绑定 profile 的字段 -->
    <form class="panel item-form" @submit.prevent="saveProfile">
      <h2>基本资料</h2>
      <label>姓名<input v-model="profile.name" required maxlength="32" /></label>
      <label>学号<input v-model="profile.username" required inputmode="numeric" maxlength="32" /></label>
      <p class="muted">当前角色：{{ user?.role === 'student' ? '学生' : user?.role }}</p>
      <p v-if="profileMessage" class="success-message">{{ profileMessage }}</p>
      <div class="form-actions"><button class="primary-button" :disabled="profileLoading">{{ profileLoading ? '保存中...' : '保存资料' }}</button></div>
    </form>
    <!-- 修改密码表单：v-model 绑定 password 三个字段；minlength/maxlength 做基础长度校验 -->
    <form class="panel item-form" @submit.prevent="savePassword">
      <h2>修改密码</h2>
      <label>当前密码<input v-model="password.oldPassword" required type="password" /></label>
      <label>新密码<input v-model="password.newPassword" required minlength="8" maxlength="16" type="password" /></label>
      <label>确认新密码<input v-model="password.confirmPassword" required minlength="8" maxlength="16" type="password" /></label>
      <p v-if="passwordMessage" class="success-message">{{ passwordMessage }}</p>
      <div class="form-actions"><button class="primary-button" :disabled="passwordLoading">{{ passwordLoading ? '修改中...' : '修改密码' }}</button></div>
    </form>
    <!-- 意见反馈表单：把用户输入交给 sendFeedback 调 POST /feedbacks；maxlength 与后端 varchar(1000) 对齐 -->
    <form class="panel item-form" @submit.prevent="sendFeedback">
      <h2>意见反馈</h2>
      <label>反馈内容<textarea v-model="feedback.content" required maxlength="1000" placeholder="说说你遇到的问题，或希望平台改进的地方"></textarea></label>
      <p v-if="feedbackMessage" class="success-message">{{ feedbackMessage }}</p>
      <div class="form-actions"><button class="primary-button" :disabled="feedbackLoading">{{ feedbackLoading ? '提交中...' : '提交反馈' }}</button></div>
    </form>
    <!-- 账号操作区（危险操作）：注销按钮显式 type="button"，避免误触发表单提交，点击调用 deleteAccount -->
    <section class="panel item-form danger-zone"><h2>账号操作</h2><p class="muted">注销账号会隐藏你发布的帖子和评论，且需要通过申诉流程恢复。</p><button class="text-button" type="button" @click="deleteAccount">注销我的账号</button></section>
  </section>
</template>
