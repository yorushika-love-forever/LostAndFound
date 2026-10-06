<script setup lang="ts">
import { reactive, ref } from 'vue'
import { createAppeal, type AppealReason } from '@/api/appeals'

const form = reactive<{ username: string; reason: AppealReason; content: string }>({ username: '', reason: 'wrongful_ban', content: '' })
const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  if (form.reason === 'other' && !form.content.trim()) { errorMessage.value = '选择其他原因时必须填写说明'; return }
  loading.value = true
  try { await createAppeal(form); submitted.value = true }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '申诉提交失败' }
  finally { loading.value = false }
}
</script>

<template>
  <section class="auth-layout">
    <div class="auth-intro"><p class="eyebrow">ACCOUNT APPEAL</p><h1>账号遇到问题？<br /><em>提交申诉。</em></h1><p>账号注销或被限制登录后，可以在这里向系统管理员说明情况。</p></div>
    <form v-if="!submitted" class="panel auth-form" @submit.prevent="submit">
      <p class="eyebrow">PUBLIC FORM</p><h2>账号申诉</h2>
      <label>学号<input v-model="form.username" required inputmode="numeric" placeholder="请输入被限制的学号" /></label>
      <label>申诉原因<select v-model="form.reason"><option value="wrongful_ban">被误封禁</option><option value="self_regret">注销后希望恢复</option><option value="other">其他原因</option></select></label>
      <label>情况说明<textarea v-model="form.content" maxlength="1000" :required="form.reason === 'other'" placeholder="请提供便于管理员核实的信息"></textarea></label>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p><button class="primary-button" :disabled="loading">{{ loading ? '提交中...' : '提交申诉' }}</button>
      <p class="form-tip"><RouterLink to="/login" class="detail-link">返回登录</RouterLink></p>
    </form>
    <div v-else class="panel auth-form"><p class="eyebrow">SUBMITTED</p><h2>申诉已提交</h2><p class="page-lead">管理员审核后会处理你的账号状态。你可以稍后返回登录页重试。</p><RouterLink to="/login" class="primary-button">返回登录</RouterLink></div>
  </section>
</template>
