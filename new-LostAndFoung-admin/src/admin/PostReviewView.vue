<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getPostsApi,
  reviewPostApi,
} from '@/api/admin'
import { formatDate, postStatusText } from '@/admin/format'
import type { AdminPost, ReviewStatus } from '@/admin/types'

const posts = ref<AdminPost[]>([])
const status = ref<ReviewStatus | ''>('pending')
const type = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')

async function loadPosts() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getPostsApi({
      page: page.value,
      page_size: pageSize,
      type: type.value,
      status: status.value,
    })

    posts.value = result.list
    total.value = result.total
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function approve(post: AdminPost) {
  if (!window.confirm(`确定通过“${post.title}”吗？`)) return

  try {
    await reviewPostApi(post.id, 'approved')
    await loadPosts()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

async function reject(post: AdminPost) {
  if (!window.confirm(`确定驳回“${post.title}”吗？`)) return

  try {
    await reviewPostApi(post.id, 'rejected')
    await loadPosts()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

function search() {
  page.value = 1
  void loadPosts()
}

onMounted(loadPosts)
</script>

<template>
  <div>
    <h2 class="page-title">帖子审核</h2>

    <div class="panel">
      <div class="filter-row">
        <select v-model="type" class="select" @change="search">
          <option value="">全部类型</option>
          <option value="lost">失物</option>
          <option value="found">招领</option>
        </select>

        <select v-model="status" class="select" @change="search">
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>

        <button class="button primary" type="button" @click="search">
          查询
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
            <th>发布人</th>
            <th>状态</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td>{{ post.title }}</td>
            <td>{{ post.type === 'lost' ? '失物' : '招领' }}</td>
            <td>{{ post.location_name || '-' }}</td>
            <td>{{ post.author_name || `用户 ${post.user_id}` }}</td>
            <td>{{ postStatusText(post.status) }}</td>
            <td>{{ formatDate(post.created_at) }}</td>
            <td>
              <template v-if="post.status === 'pending'">
                <button
                  class="button small primary"
                  type="button"
                  @click="approve(post)"
                >
                  通过
                </button>
                <button
                  class="button small danger"
                  type="button"
                  @click="reject(post)"
                >
                  驳回
                </button>
              </template>
              <span v-else>已处理</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && posts.length === 0" class="empty-text">
        暂无数据
      </p>

      <div class="pagination">
        <button
          class="button"
          type="button"
          :disabled="page <= 1"
          @click="page--; loadPosts()"
        >
          上一页
        </button>
        <span>第 {{ page }} 页，共 {{ total }} 条</span>
        <button
          class="button"
          type="button"
          :disabled="page * pageSize >= total"
          @click="page++; loadPosts()"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>
