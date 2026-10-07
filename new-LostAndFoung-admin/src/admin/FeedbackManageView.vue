<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getFeedbacksApi,
  reviewFeedbackApi,
} from '@/api/admin'
import { formatDate } from '@/admin/format'
import type { AdminFeedback } from '@/admin/types'

const feedbacks = ref<AdminFeedback[]>([])
const loading = ref(false)
const errorMessage = ref('')

function statusText(status: string) {
  if (status === 'pending') return '待处理'
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  return status
}

async function loadFeedbacks() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getFeedbacksApi({
      page: 1,
      page_size: 100,
    })
    feedbacks.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '反馈加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadFeedbacks)

async function review(
  feedback: AdminFeedback,
  status: 'approved' | 'rejected',
) {
  const text = status === 'approved' ? '通过' : '拒绝'
  if (!window.confirm(`确定${text}这条反馈吗？`)) return

  try {
    await reviewFeedbackApi(feedback.id, status)
    await loadFeedbacks()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}
</script>

<template>
  <div>
    <h2 class="page-title">意见反馈</h2>

    <div class="panel">
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table feedback-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>提交人</th>
            <th>反馈内容</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="feedback in feedbacks" :key="feedback.id">
            <td>{{ feedback.id }}</td>
            <td>{{ feedback.author_name || `用户 ${feedback.user_id}` }}</td>
            <td>{{ feedback.content }}</td>
            <td>{{ statusText(feedback.status) }}</td>
            <td>{{ formatDate(feedback.created_at) }}</td>
            <td>
              <template v-if="feedback.status === 'pending'">
                <button
                  class="button small primary"
                  type="button"
                  @click="review(feedback, 'approved')"
                >
                  通过
                </button>
                <button
                  class="button small danger"
                  type="button"
                  @click="review(feedback, 'rejected')"
                >
                  拒绝
                </button>
              </template>
              <span v-else>已处理</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && feedbacks.length === 0" class="empty-text">
        暂无意见反馈
      </p>
    </div>
  </div>
</template>

<style scoped>
.feedback-table {
  margin-top: 16px;
}
</style>
