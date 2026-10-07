<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  deleteCommentApi,
  getPostCommentsApi,
  getPostsApi,
} from '@/api/admin'
import { formatDate } from '@/admin/format'
import type { AdminComment, AdminPost } from '@/admin/types'

const posts = ref<AdminPost[]>([])
const selectedPostId = ref('')
const comments = ref<AdminComment[]>([])
const loading = ref(false)
const errorMessage = ref('')

async function loadPosts() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getPostsApi({
      page: 1,
      page_size: 100,
    })
    posts.value = result.list

    if (posts.value.length > 0) {
      selectedPostId.value = String(posts.value[0]?.id || '')
      await loadComments()
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '帖子加载失败'
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  if (!selectedPostId.value) {
    comments.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getPostCommentsApi(selectedPostId.value)
    comments.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '评论加载失败'
  } finally {
    loading.value = false
  }
}

async function removeComment(comment: AdminComment) {
  if (!window.confirm('确定删除这条评论吗？')) return

  try {
    await deleteCommentApi(comment.id)
    await loadComments()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '删除失败')
  }
}

onMounted(loadPosts)
</script>

<template>
  <div>
    <h2 class="page-title">评论管理</h2>

    <div class="panel">
      <div class="form-item">
        <label>选择帖子</label>
        <select
          v-model="selectedPostId"
          class="select"
          @change="loadComments"
        >
          <option
            v-for="post in posts"
            :key="post.id"
            :value="String(post.id)"
          >
            {{ post.id }} - {{ post.title }}
          </option>
        </select>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>帖子编号</th>
            <th>作者</th>
            <th>评论内容</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="comment in comments" :key="comment.id">
            <td>{{ comment.id }}</td>
            <td>{{ comment.post_id }}</td>
            <td>{{ comment.author_name || `用户 ${comment.user_id}` }}</td>
            <td>{{ comment.content }}</td>
            <td>{{ formatDate(comment.created_at) }}</td>
            <td>
              <button
                class="button small danger"
                type="button"
                @click="removeComment(comment)"
              >
                删除评论
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && comments.length === 0" class="empty-text">
        该帖子暂无评论
      </p>
    </div>
  </div>
</template>
