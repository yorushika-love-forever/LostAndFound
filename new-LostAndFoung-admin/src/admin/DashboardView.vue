<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPostsApi, getStatsApi } from '@/api/admin'
import { backendSupport } from '@/admin/config'
import { formatDate, postStatusText } from '@/admin/format'
import type { AdminPost, DashboardOverview } from '@/admin/types'

const overview = ref<DashboardOverview>({
  total_posts: 0,
  pending_posts: 0,
  approved_posts: 0,
  rejected_posts: 0,
})
const pendingPosts = ref<AdminPost[]>([])
const loading = ref(false)
const errorMessage = ref('')

const approvalRate = computed(() => {
  if (overview.value.total_posts === 0) return '0%'

  return `${Math.round(
    (overview.value.approved_posts / overview.value.total_posts) * 100,
  )}%`
})

async function loadOverview() {
  // 当前服务器的 /admin/stats 还是 404。
  // 所以先通过帖子列表统计。等后端补好后，把 config.ts 的 statistics 改成 true。
  if (backendSupport.statistics) {
    return getStatsApi()
  }

  const [all, pending, approved, rejected] = await Promise.all([
    getPostsApi({ page: 1, page_size: 1 }),
    getPostsApi({ page: 1, page_size: 1, status: 'pending' }),
    getPostsApi({ page: 1, page_size: 1, status: 'approved' }),
    getPostsApi({ page: 1, page_size: 1, status: 'rejected' }),
  ])

  return {
    total_posts: all.total,
    pending_posts: pending.total,
    approved_posts: approved.total,
    rejected_posts: rejected.total,
  }
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [overviewData, postData] = await Promise.all([
      loadOverview(),
      getPostsApi({
        page: 1,
        page_size: 5,
        status: 'pending',
      }),
    ])

    overview.value = overviewData
    pendingPosts.value = postData.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div>
    <h2 class="page-title">数据总览</h2>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <div class="card-grid">
      <div class="stat-card">
        <span>信息总量</span>
        <strong>{{ overview.total_posts }}</strong>
      </div>
      <div class="stat-card">
        <span>待审核</span>
        <strong>{{ overview.pending_posts }}</strong>
      </div>
      <div class="stat-card">
        <span>已通过</span>
        <strong>{{ overview.approved_posts }}</strong>
      </div>
      <div class="stat-card">
        <span>通过率</span>
        <strong>{{ approvalRate }}</strong>
      </div>
    </div>

    <div class="panel">
      <h3 class="panel-title">待审核信息</h3>

      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>标题</th>
            <th>类型</th>
            <th>地点</th>
            <th>状态</th>
            <th>发布时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in pendingPosts" :key="post.id">
            <td>{{ post.id }}</td>
            <td>{{ post.title }}</td>
            <td>{{ post.type === 'lost' ? '失物' : '招领' }}</td>
            <td>{{ post.location_name || '-' }}</td>
            <td>{{ postStatusText(post.status) }}</td>
            <td>{{ formatDate(post.created_at) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && pendingPosts.length === 0" class="empty-text">
        暂无待审核信息
      </p>
    </div>
  </div>
</template>

<style scoped>
.panel-title {
  margin: 0 0 14px;
  color: #0f172a;
}
</style>
