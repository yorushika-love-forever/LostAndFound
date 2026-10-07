<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminLogin } from '@/admin/auth'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function login() {
  errorMessage.value = ''

  if (!username.value || !password.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  loading.value = true

  try {
    await adminLogin(username.value, password.value)

    const redirect =
      typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/admin/dashboard'

    router.push(redirect)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login-page">
    <div class="admin-login-box">
      <h1>失物招领管理端</h1>
      <p>使用管理员账号登录</p>

      <div class="form-item">
        <label>用户名</label>
        <input
          v-model="username"
          class="input"
          type="text"
          placeholder="请输入用户名"
          @keyup.enter="login"
        />
      </div>

      <div class="form-item">
        <label>密码</label>
        <input
          v-model="password"
          class="input"
          type="password"
          placeholder="请输入密码"
          @keyup.enter="login"
        />
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <button
        class="button primary login-button"
        type="button"
        :disabled="loading"
        @click="login"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </div>
</template>
