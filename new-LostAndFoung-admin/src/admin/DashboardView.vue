<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAdminCountApi, getPostsApi } from '@/api/admin'
import { getAdminUser } from '@/admin/auth'
import { backendSupport } from '@/admin/config'
import BarChart from '@/admin/BarChart.vue'
import { formatDate, postStatusText } from '@/admin/format'
import type { AdminPost, DashboardOverview } from '@/admin/types'

const currentUser = getAdminUser()
const isMainAdmin = currentUser?.role === 'mainadmin'
const adminCount = ref<DashboardOverview>({
  user_count: 0,
  post_count: 0,
  pending_post_count: 0,
  pending_appeal_count: 0,
  today_post_count: 0,
  today_comment_count: 0,
})
const allPosts = ref<AdminPost[]>([])
const pendingPosts = ref<AdminPost[]>([])
const loading = ref(false)
const errorMessage = ref('')

const approvalRate = computed(() => {
  if (allPosts.value.length === 0) return '0%'

  const approved = allPosts.value.filter(
    (post) => post.status === 'approved',
  ).length

  return `${Math.round((approved / allPosts.value.length) * 100)}%`
})

const postTotal = computed(() => allPosts.value.length)
const pendingTotal = computed(() => {
  return allPosts.value.filter((post) => post.status === 'pending').length
})
const approvedTotal = computed(() => {
  return allPosts.value.filter((post) => post.status === 'approved').length
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

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const posts = await loadAllPosts()

    allPosts.value = posts
    pendingPosts.value = posts
      .filter((post) => post.status === 'pending')
      .slice(0, 5)

    if (isMainAdmin && backendSupport.statistics) {
      adminCount.value = await getAdminCountApi()
    }
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
    <p v-if="!isMainAdmin" class="stats-note">
      当前账号展示帖子统计。系统管理员登录后可以看到用户、申诉、
      今日帖子和今日评论统计。
    </p>

    <div v-if="isMainAdmin" class="card-grid">
      <div class="stat-card">
        <span>用户总数</span>
        <strong>{{ adminCount.user_count }}</strong>
      </div>
      <div class="stat-card">
        <span>帖子总数</span>
        <strong>{{ adminCount.post_count }}</strong>
      </div>
      <div class="stat-card">
        <span>待审核帖子</span>
        <strong>{{ adminCount.pending_post_count }}</strong>
      </div>
      <div class="stat-card">
        <span>待处理申诉</span>
        <strong>{{ adminCount.pending_appeal_count }}</strong>
      </div>
      <div class="stat-card">
        <span>今日新帖</span>
        <strong>{{ adminCount.today_post_count }}</strong>
      </div>
      <div class="stat-card">
        <span>今日评论</span>
        <strong>{{ adminCount.today_comment_count }}</strong>
      </div>
    </div>

    <div v-else class="card-grid">
      <div class="stat-card">
        <span>信息总量</span>
        <strong>{{ postTotal }}</strong>
      </div>
      <div class="stat-card">
        <span>待审核</span>
        <strong>{{ pendingTotal }}</strong>
      </div>
      <div class="stat-card">
        <span>已通过</span>
        <strong>{{ approvedTotal }}</strong>
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
