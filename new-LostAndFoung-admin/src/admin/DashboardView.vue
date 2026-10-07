<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPostsApi, getStatsApi } from '@/api/admin'
import { backendSupport } from '@/admin/config'
import BarChart from '@/admin/BarChart.vue'
import { formatDate, postStatusText } from '@/admin/format'
import type { AdminPost, DashboardOverview } from '@/admin/types'

const overview = ref<DashboardOverview>({
  total_posts: 0,
  pending_posts: 0,
  approved_posts: 0,
  rejected_posts: 0,
})
const allPosts = ref<AdminPost[]>([])
const pendingPosts = ref<AdminPost[]>([])
const loading = ref(false)
const errorMessage = ref('')

const approvalRate = computed(() => {
  if (overview.value.total_posts === 0) return '0%'

  return `${Math.round(
    (overview.value.approved_posts / overview.value.total_posts) * 100,
  )}%`
})

const typeChartItems = computed(() => {
  const lost = allPosts.value.filter((post) => post.type === 'lost').length
  const found = allPosts.value.filter((post) => post.type === 'found').length

  return [
    { label: '失物', value: lost },
    { label: '招领', value: found },
  ]
})

const statusChartItems = computed(() => {
  const pending = allPosts.value.filter(
    (post) => post.status === 'pending',
  ).length
  const approved = allPosts.value.filter(
    (post) => post.status === 'approved',
  ).length
  const rejected = allPosts.value.filter(
    (post) => post.status === 'rejected',
  ).length

  return [
    { label: '待审核', value: pending },
    { label: '已通过', value: approved },
    { label: '已驳回', value: rejected },
  ]
})

const trendChartItems = computed(() => {
  const items: { label: string; value: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - i)

    const key = getDateKey(date)
    const value = allPosts.value.filter(
      (post) => getDateKey(new Date(post.created_at)) === key,
    ).length

    items.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      value,
    })
  }

  return items
})

const locationChartItems = computed(() => {
  const counts: Record<string, number> = {}

  allPosts.value.forEach((post) => {
    const location = post.location_name?.trim() || '未填写地点'
    counts[location] = (counts[location] || 0) + 1
  })

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
})

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

async function loadAllPosts() {
  const list: AdminPost[] = []
  let page = 1

  while (true) {
    const result = await getPostsApi({
      page,
      page_size: 100,
    })

    list.push(...result.list)

    if (list.length >= result.total || result.list.length === 0) {
      break
    }

    page++
  }

  return list
}

async function loadOverview(posts: AdminPost[]) {
  // 当前服务器的 /admin/stats 还是 404。
  // 所以先通过帖子列表统计。等后端补好后，把 config.ts 的 statistics 改成 true。
  if (backendSupport.statistics) {
    return getStatsApi()
  }

  return {
    total_posts: posts.length,
    pending_posts: posts.filter((post) => post.status === 'pending').length,
    approved_posts: posts.filter((post) => post.status === 'approved').length,
    rejected_posts: posts.filter((post) => post.status === 'rejected').length,
  }
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const posts = await loadAllPosts()
    const overviewData = await loadOverview(posts)

    allPosts.value = posts
    overview.value = overviewData
    pendingPosts.value = posts
      .filter((post) => post.status === 'pending')
      .slice(0, 5)
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
    <p v-if="!backendSupport.statistics" class="stats-note">
      当前图表基于帖子数据统计。用户、认领和公告的完整全校统计，
      需要后端提供统计接口。
    </p>

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

    <div class="chart-grid">
      <BarChart title="失物与招领" :items="typeChartItems" />
      <BarChart title="审核状态" :items="statusChartItems" />
      <BarChart title="最近 7 天发布量" :items="trendChartItems" />
      <BarChart title="热门地点" :items="locationChartItems" />
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

.stats-note {
  padding: 12px 14px;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  color: #075985;
  background: #f0f9ff;
}

.chart-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 18px;
}

@media (max-width: 800px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
