<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()
const form = reactive({ studentNo: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  loading.value = true
  errorMessage.value = ''
  try {
    await login(form.studentNo, form.password)
    await router.push('/home')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <div class="auth-intro"><p class="eyebrow">CAMPUS LOST & FOUND</p><h1>让每一件遗失物<br /><em>回到它的主人身边。</em></h1><p>在校园里寻找线索，也把偶然拾到的物品交给正确的人。</p></div>
    <form class="panel auth-form" @submit.prevent="submit">
      <p class="eyebrow">WELCOME BACK</p><h2>登录找光</h2>
      <p v-if="route.query.registered" class="success-message">注册成功，请使用新账号登录。</p>
      <label>学号<input v-model="form.studentNo" required inputmode="numeric" placeholder="请输入学号" /></label>
      <label>密码<input v-model="form.password" required minlength="8" type="password" placeholder="请输入密码（8-16 位）" /></label>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <button class="primary-button" :disabled="loading">{{ loading ? '登录中...' : '进入系统' }}</button>
      <p class="form-tip">还没有账号？<RouterLink to="/register" class="detail-link">立即注册</RouterLink> · <RouterLink to="/appeal" class="detail-link">账号申诉</RouterLink></p>
    </form>
  </section>
</template>
