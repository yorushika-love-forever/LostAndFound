<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getPostsApi,
  updatePostFinishedApi,
  updatePostStatusApi,
} from '@/api/admin'
import { formatDate, postStatusText } from '@/admin/format'
import type { AdminPost, ReviewStatus } from '@/admin/types'

const posts = ref<AdminPost[]>([])
const status = ref<ReviewStatus | ''>('')
const loading = ref(false)
const errorMessage = ref('')

async function loadPosts() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getPostsApi({
      page: 1,
      page_size: 100,
      status: status.value,
    })
    posts.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function changeStatus(post: AdminPost, nextStatus: ReviewStatus) {
  try {
    await updatePostStatusApi(post.id, nextStatus)
    await loadPosts()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

async function changeFinished(post: AdminPost) {
  const nextFinished = !post.is_finished

  try {
    await updatePostFinishedApi(post.id, nextFinished)
    await loadPosts()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

onMounted(loadPosts)
</script>

<template>
  <div>
    <h2 class="page-title">物品状态</h2>

    <div class="panel">
      <div class="filter-row">
        <select v-model="status" class="select" @change="loadPosts">
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>

        <button class="button" type="button" @click="loadPosts">
          刷新
        </button>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>标题</th>
            <th>类型</th>
            <th>地点</th>
            <th>是否完成</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td>{{ post.title }}</td>
            <td>{{ post.type === 'lost' ? '失物' : '招领' }}</td>
            <td>{{ post.location_name || '-' }}</td>
            <td>{{ post.is_finished ? '已完成' : '未完成' }}</td>
            <td>{{ postStatusText(post.status) }}</td>
            <td>{{ formatDate(post.updated_at) }}</td>
            <td>
              <button
                v-if="post.status === 'approved'"
                class="button small primary"
                type="button"
                @click="changeFinished(post)"
              >
                {{ post.is_finished ? '设为未完成' : '设为已完成' }}
              </button>
              <button
                v-if="post.status !== 'approved'"
                class="button small primary"
                type="button"
                @click="changeStatus(post, 'approved')"
              >
                设为已通过
              </button>
              <button
                v-if="post.status !== 'rejected'"
                class="button small danger"
                type="button"
                @click="changeStatus(post, 'rejected')"
              >
                设为已驳回
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && posts.length === 0" class="empty-text">
        暂无可管理的物品
      </p>
    </div>
  </div>
</template>
