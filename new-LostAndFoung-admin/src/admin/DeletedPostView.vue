<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getDeletedPostsApi, recoverPostApi } from '@/api/admin'
import { formatDate } from '@/admin/format'
import type { AdminPost } from '@/admin/types'

const posts = ref<AdminPost[]>([])
const loading = ref(false)
const errorMessage = ref('')

async function loadPosts() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getDeletedPostsApi({
      page: 1,
      page_size: 100,
    })
    posts.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '已删除帖子加载失败'
  } finally {
    loading.value = false
  }
}

async function recover(post: AdminPost) {
  if (!window.confirm(`确定恢复“${post.title}”吗？`)) return

  try {
    await recoverPostApi(post.id)
    await loadPosts()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '恢复失败')
  }
}

onMounted(loadPosts)
</script>

<template>
  <div>
    <h2 class="page-title">已删除帖子</h2>

    <div class="panel">
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>标题</th>
            <th>类型</th>
            <th>发布人</th>
            <th>地点</th>
            <th>删除时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td>{{ post.title }}</td>
            <td>{{ post.type === 'lost' ? '失物' : '招领' }}</td>
            <td>{{ post.author_name || `用户 ${post.user_id}` }}</td>
            <td>{{ post.location_name || '-' }}</td>
            <td>{{ formatDate(post.deleted_at || '') }}</td>
            <td>
              <button
                class="button small primary"
                type="button"
                @click="recover(post)"
              >
                恢复帖子
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && posts.length === 0" class="empty-text">
        暂无已删除帖子
      </p>
    </div>
  </div>
</template>
