<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getPendingReviewsApi,
  reviewAppealApi,
} from '@/api/admin'
import { formatDate } from '@/admin/format'
import type { AdminAppeal } from '@/admin/types'

const appeals = ref<AdminAppeal[]>([])
const loading = ref(false)
const errorMessage = ref('')

function reasonText(reason: string) {
  if (reason === 'self_regret') return '注销后希望恢复'
  if (reason === 'wrongful_ban') return '被误封禁'
  return '其他原因'
}

function statusText(status: string) {
  if (status === 'pending') return '待处理'
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  return status
}

async function loadAppeals() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getPendingReviewsApi()
    appeals.value = result.appeals
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '申诉加载失败'
  } finally {
    loading.value = false
  }
}

async function review(
  appeal: AdminAppeal,
  status: 'approved' | 'rejected',
) {
  const text = status === 'approved' ? '通过' : '拒绝'
  if (!window.confirm(`确定${text}这条申诉吗？`)) return

  try {
    await reviewAppealApi(appeal.id, status)
    await loadAppeals()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

onMounted(loadAppeals)
</script>

<template>
  <div>
    <h2 class="page-title">申诉审核</h2>

    <div class="panel">
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>用户编号</th>
            <th>申诉原因</th>
            <th>情况说明</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="appeal in appeals" :key="appeal.id">
            <td>{{ appeal.id }}</td>
            <td>{{ appeal.user_id }}</td>
            <td>{{ reasonText(appeal.reason) }}</td>
            <td>{{ appeal.content }}</td>
            <td>{{ statusText(appeal.status) }}</td>
            <td>{{ formatDate(appeal.created_at) }}</td>
            <td>
              <template v-if="appeal.status === 'pending'">
                <button
                  class="button small primary"
                  type="button"
                  @click="review(appeal, 'approved')"
                >
                  通过
                </button>
                <button
                  class="button small danger"
                  type="button"
                  @click="review(appeal, 'rejected')"
                >
                  拒绝
                </button>
              </template>
              <span v-else>已处理</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && appeals.length === 0" class="empty-text">
        暂无待审核申诉
      </p>
    </div>
  </div>
</template>
