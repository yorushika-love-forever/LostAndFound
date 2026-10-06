<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createFinishRequest, getMessages, reviewFinishRequest, sendMessage, type Message } from '@/api/conversations'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const { user } = useAuth()
const messages = ref<Message[]>([])
const content = ref('')
const loading = ref(true)
const sending = ref(false)
const errorMessage = ref('')
const finishLoading = ref(false)
const finishMessage = ref('')
const conversationId = Number(route.params.id)

async function loadMessages() {
  if (!conversationId) {
    errorMessage.value = '会话地址无效'
    loading.value = false
    return
  }
  try {
    messages.value = await getMessages(conversationId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '消息加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  const text = content.value.trim()
  if (!text || sending.value) return
  sending.value = true
  errorMessage.value = ''
  try {
    messages.value.push(await sendMessage(conversationId, text))
    content.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '消息发送失败'
  } finally {
    sending.value = false
  }
}

async function requestFinish() {
  if (finishLoading.value) return
  finishLoading.value = true
  finishMessage.value = ''
  try {
    await createFinishRequest(conversationId)
    finishMessage.value = '已发起完成寻找申请，等待对方确认。'
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '无法发起完成申请'
  } finally {
    finishLoading.value = false
  }
}

async function reviewFinish(status: 'agreed' | 'rejected') {
  const requestId = window.prompt('请输入待处理的完成申请编号')
  if (!requestId || !/^\d+$/.test(requestId)) return
  finishLoading.value = true
  try {
    await reviewFinishRequest(conversationId, Number(requestId), status)
    finishMessage.value = status === 'agreed' ? '已同意，帖子已标记为完成。' : '已拒绝完成申请。'
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '处理完成申请失败'
  } finally {
    finishLoading.value = false
  }
}

onMounted(loadMessages)
</script>

<template>
  <section class="conversation-page">
    <div class="section-heading"><div><p class="eyebrow">CONVERSATION</p><h1>认领沟通</h1></div><RouterLink to="/mine" class="secondary-button">返回我的记录</RouterLink></div>
    <div class="panel conversation-panel">
      <div v-if="loading" class="empty-state">正在加载消息...</div>
      <div v-else-if="!messages.length" class="empty-state">还没有消息，先介绍一下物品特征吧。</div>
      <div v-else class="message-list">
        <div v-for="message in messages" :key="message.id" class="message-row" :class="{ mine: message.senderId === user?.id }">
          <div class="message-bubble"><p>{{ message.content }}</p><time>{{ new Date(message.createdAt).toLocaleString() }}</time></div>
        </div>
      </div>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="finishMessage" class="success-message">{{ finishMessage }}</p>
      <div class="conversation-actions">
        <button class="secondary-button" :disabled="finishLoading" @click="requestFinish">申请完成寻找</button>
        <button class="secondary-button" :disabled="finishLoading" @click="reviewFinish('agreed')">同意完成申请</button>
        <button class="text-button" :disabled="finishLoading" @click="reviewFinish('rejected')">拒绝完成申请</button>
      </div>
      <form class="message-form" @submit.prevent="submit">
        <textarea v-model="content" maxlength="1000" required placeholder="输入消息"></textarea>
        <button class="primary-button" :disabled="sending">{{ sending ? '发送中...' : '发送消息' }}</button>
      </form>
    </div>
  </section>
</template>
