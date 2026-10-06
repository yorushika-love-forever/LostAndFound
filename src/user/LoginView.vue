<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

// useRouter 可以在 JavaScript 中主动跳转页面。
const router = useRouter()
const { login } = useAuth()
// reactive 适合管理一个表单对象；修改 form 的属性时，页面会自动更新。
const form = reactive({ studentNo: '', password: '' })
// ref 适合管理一个单独的响应式值。读取或修改时，在 script 中要使用 .value。
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  // 提交期间禁用按钮，避免用户重复点击。
  loading.value = true
  errorMessage.value = ''
  try {
    // 调用登录状态模块；成功后进入首页。
    await login(form.studentNo, form.password)
    router.push('/home')
  } catch (error) {
    // catch 捕获接口错误，并把错误文字显示给用户。
    errorMessage.value = error instanceof Error ? error.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <div class="auth-intro">
      <p class="eyebrow">CAMPUS LOST & FOUND</p>
      <h1>让每一件遗失物，<br /><em>回到它的主人身边。</em></h1>
      <p>在校园里寻找线索，也把偶然捡到的物品交给正确的人。</p>
    </div>
    <!-- @submit.prevent：监听表单提交，并阻止浏览器默认刷新行为。 -->
    <form class="panel auth-form" @submit.prevent="submit">
      <p class="eyebrow">WELCOME BACK</p>
      <h2>登录拾光</h2>
      <!-- v-model 会把输入框和 form.studentNo 双向绑定。 -->
      <label>学号<input v-model="form.studentNo" required placeholder="请输入学号" /></label>
      <label>密码<input v-model="form.password" required minlength="8" type="password" placeholder="请输入密码（8-16位）" /></label>
      <!-- v-if 只有在 errorMessage 不为空时才渲染错误提示。 -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <!-- :disabled 绑定 loading，登录请求期间按钮不能再次点击。 -->
      <button class="primary-button" :disabled="loading">{{ loading ? '登录中...' : '进入系统' }}</button>
      <p class="form-tip">请输入后端系统中已经注册的学号和密码。</p>
    </form>
  </section>
</template>
