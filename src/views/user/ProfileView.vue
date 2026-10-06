<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deactivateAccount, updatePassword, updateProfile } from '@/api/auth'
import { useAuth } from '@/stores/auth'

const router = useRouter()
const { user, refreshUser, logout } = useAuth()
const profile = reactive({ name: user.value?.name || '', username: user.value?.studentNo || '' })
const password = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const profileMessage = ref('')
const passwordMessage = ref('')
const errorMessage = ref('')
const profileLoading = ref(false)
const passwordLoading = ref(false)

async function saveProfile() {
  profileMessage.value = ''; errorMessage.value = ''; profileLoading.value = true
  try { await updateProfile({ name: profile.name, username: profile.username }); await refreshUser(); profileMessage.value = '资料已更新' }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '资料更新失败' }
  finally { profileLoading.value = false }
}

async function savePassword() {
  passwordMessage.value = ''; errorMessage.value = ''; passwordLoading.value = true
  try { await updatePassword(password); password.oldPassword = ''; password.newPassword = ''; password.confirmPassword = ''; passwordMessage.value = '密码修改成功，请牢记新密码' }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '密码修改失败' }
  finally { passwordLoading.value = false }
}

async function deleteAccount() {
  if (!window.confirm('注销后账号和自己发布的内容将被软删除，确定继续吗？')) return
  try { await deactivateAccount(); logout(); await router.push('/login') }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '账号注销失败' }
}
</script>

<template>
  <section class="form-page">
    <div class="section-heading"><div><p class="eyebrow">MY PROFILE</p><h1>个人资料</h1><p class="page-lead">管理你的账号信息和安全设置。</p></div></div>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <form class="panel item-form" @submit.prevent="saveProfile">
      <h2>基本资料</h2>
      <label>姓名<input v-model="profile.name" required maxlength="32" /></label>
      <label>学号<input v-model="profile.username" required inputmode="numeric" maxlength="32" /></label>
      <p class="muted">当前角色：{{ user?.role === 'student' ? '学生' : user?.role }}</p>
      <p v-if="profileMessage" class="success-message">{{ profileMessage }}</p>
      <div class="form-actions"><button class="primary-button" :disabled="profileLoading">{{ profileLoading ? '保存中...' : '保存资料' }}</button></div>
    </form>
    <form class="panel item-form" @submit.prevent="savePassword">
      <h2>修改密码</h2>
      <label>当前密码<input v-model="password.oldPassword" required type="password" /></label>
      <label>新密码<input v-model="password.newPassword" required minlength="8" maxlength="16" type="password" /></label>
      <label>确认新密码<input v-model="password.confirmPassword" required minlength="8" maxlength="16" type="password" /></label>
      <p v-if="passwordMessage" class="success-message">{{ passwordMessage }}</p>
      <div class="form-actions"><button class="primary-button" :disabled="passwordLoading">{{ passwordLoading ? '修改中...' : '修改密码' }}</button></div>
    </form>
    <section class="panel item-form danger-zone"><h2>账号操作</h2><p class="muted">注销账号会隐藏你发布的帖子和评论，且需要通过申诉流程恢复。</p><button class="text-button" type="button" @click="deleteAccount">注销我的账号</button></section>
  </section>
</template>
