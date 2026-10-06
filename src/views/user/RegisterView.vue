<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'

const router = useRouter()
const form = reactive({ username: '', name: '', password: '', confirmPassword: '' })
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  if (!/^\d+$/.test(form.username.trim())) {
    errorMessage.value = '学号只能填写数字'
    return
  }
  if (form.password.length < 8 || form.password.length > 16) {
    errorMessage.value = '密码长度需要为 8-16 位'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await register(form.username, form.name, form.password)
    await router.push({ path: '/login', query: { registered: '1' } })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <div class="auth-intro"><p class="eyebrow">JOIN THE CAMPUS</p><h1>创建你的<br /><em>校园账号。</em></h1><p>注册后即可发布线索、参与认领并和失主安全沟通。</p></div>
    <form class="panel auth-form" @submit.prevent="submit">
      <p class="eyebrow">NEW ACCOUNT</p><h2>注册找光</h2>
      <label>学号<input v-model="form.username" required inputmode="numeric" maxlength="32" placeholder="请输入数字学号" /></label>
      <label>姓名<input v-model="form.name" required maxlength="32" placeholder="请输入真实姓名" /></label>
      <label>密码<input v-model="form.password" required type="password" minlength="8" maxlength="16" placeholder="8-16 位密码" /></label>
      <label>确认密码<input v-model="form.confirmPassword" required type="password" minlength="8" maxlength="16" placeholder="再次输入密码" /></label>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <button class="primary-button" :disabled="loading">{{ loading ? '注册中...' : '创建账号' }}</button>
      <p class="form-tip">已有账号？<RouterLink to="/login" class="detail-link">返回登录</RouterLink></p>
    </form>
  </section>
</template>
