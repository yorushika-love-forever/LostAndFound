<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deletePost, getMyItems } from '@/api/posts'
import { getMyClaims } from '@/api/conversations'
import { useAuth } from '@/stores/auth'
import type { ClaimApplication, LostItem } from '@/types'
import { formatDate, itemStatusText } from '@/utils/format'

type RecordTab = 'items' | 'claims'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const myItems = ref<LostItem[]>([])
const claims = ref<ClaimApplication[]>([])
const activeTab = ref<RecordTab>(route.query.tab === 'claims' ? 'claims' : 'items')
const itemsLoading = ref(false)
const claimsLoading = ref(false)
const deletingId = ref<number | null>(null)
const errorMessage = ref('')

const currentLoading = computed(() => activeTab.value === 'items' ? itemsLoading.value : claimsLoading.value)

function switchTab(tab: RecordTab) {
  activeTab.value = tab
  router.replace({ query: tab === 'claims' ? { tab: 'claims' } : {} })
}

async function loadItems() {
  itemsLoading.value = true
  try {
    myItems.value = await getMyItems()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '发布记录加载失败'
  } finally {
    itemsLoading.value = false
  }
}

async function loadClaims() {
  claimsLoading.value = true
  try {
    claims.value = await getMyClaims()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '认领记录加载失败'
  } finally {
    claimsLoading.value = false
  }
}

async function loadRecords() {
  if (!user.value) return
  errorMessage.value = ''
  await Promise.all([loadItems(), loadClaims()])
}

async function removeItem(id: number) {
  if (deletingId.value !== null) return
  if (!window.confirm('确定要删除这条发布吗？删除后其他用户将无法查看。')) return

  deletingId.value = id
  errorMessage.value = ''
  try {
    await deletePost(id)
    myItems.value = myItems.value.filter((item) => item.id !== id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败'
  } finally {
    deletingId.value = null
  }
}

function itemStatus(item: LostItem) {
  return item.isFinished ? '已完成' : itemStatusText(item.status)
}

function claimStatus(claim: ClaimApplication) {
  return claim.status === 'active' ? '沟通中' : '待处理'
}

onMounted(loadRecords)
</script>

<template>
  <section class="section-heading">
    <div>
      <p class="eyebrow">YOUR ACTIVITY</p>
      <h1>我的记录</h1>
      <p class="page-lead">查看你发布的信息和参与过的认领沟通。</p>
    </div>
    <div class="form-actions">
      <button class="secondary-button" :disabled="currentLoading" @click="loadRecords">刷新记录</button>
      <RouterLink to="/publish" class="primary-button">发布新信息</RouterLink>
    </div>
  </section>

  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

  <div class="tabs" role="tablist" aria-label="我的记录分类">
    <button
      type="button"
      role="tab"
      :aria-selected="activeTab === 'items'"
      :class="{ selected: activeTab === 'items' }"
      @click="switchTab('items')"
    >
      我的发布（{{ myItems.length }}）
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="activeTab === 'claims'"
      :class="{ selected: activeTab === 'claims' }"
      @click="switchTab('claims')"
    >
      我的认领（{{ claims.length }}）
    </button>
  </div>

  <section v-if="activeTab === 'items'" class="record-list" aria-label="我的发布">
    <div v-if="itemsLoading" class="empty-state">正在加载你的发布记录...</div>
    <template v-else-if="myItems.length">
      <article v-for="item in myItems" :key="item.id" class="record-row">
        <div class="record-main">
          <RouterLink :to="`/items/${item.id}`" class="record-title">{{ item.title }}</RouterLink>
          <p class="muted">
            {{ item.type === 'lost' ? '失物' : '招领' }} · {{ item.location }} · {{ formatDate(item.createdAt) }}
          </p>
        </div>
        <div class="record-actions">
          <span class="status-pill">{{ itemStatus(item) }}</span>
          <button class="text-button" :disabled="deletingId === item.id" @click="removeItem(item.id)">
            {{ deletingId === item.id ? '删除中...' : '删除' }}
          </button>
        </div>
      </article>
    </template>
    <div v-else class="empty-state">你还没有发布过信息。</div>
  </section>

  <section v-else class="record-list" aria-label="我的认领">
    <div v-if="claimsLoading" class="empty-state">正在加载你的认领记录...</div>
    <template v-else-if="claims.length">
      <article v-for="claim in claims" :key="claim.id" class="record-row">
        <div class="record-main">
          <RouterLink :to="`/conversations/${claim.id}`" class="record-title">{{ claim.itemTitle }}</RouterLink>
          <p class="muted">开始沟通：{{ formatDate(claim.createdAt) }}</p>
        </div>
        <div class="record-actions">
          <span class="status-pill">{{ claimStatus(claim) }}</span>
          <RouterLink class="detail-link" :to="`/conversations/${claim.id}`">查看对话</RouterLink>
        </div>
      </article>
    </template>
    <div v-else class="empty-state">你还没有提交过认领申请。</div>
  </section>
</template>
