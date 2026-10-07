/**
 * MyView.vue —— 学生端「我的记录」页面（对应路由 /mine）
 *
 * 页面作用：顶部是标题与操作按钮，下方用三个标签页分别展示
 *   1）我的发布：当前登录用户发布过的失物/招领帖子；
 *   2）我的认领：当前用户发起过的认领会话（通过地址栏 ?tab=claims 切换）；
 *   3）我的收藏：当前用户收藏过的帖子（通过地址栏 ?tab=favorites 切换）。
 *
 * 依赖接口：getMyItems()（我发布的帖子）、getMyClaims()（我的认领会话）、
 *          getFavoriteItems()（我收藏的帖子，取自 /auth/profile 的 favorites）、
 *          deletePost(id)（删除某条帖子）。列表接口内部会自动分页取全量。
 * 主要交互：切换标签、刷新记录、删除帖子、跳转到发布页或帖子详情页。
 */
<script setup lang="ts">
// Vue 组合式 API：ref 创建响应式数据，computed 创建派生状态，onMounted 注册“挂载后”回调。
import { computed, onMounted, ref } from 'vue'
// useRoute 读取当前路由（这里主要用 query.tab），useRouter 用于编程式导航（replace/push）。
import { useRoute, useRouter } from 'vue-router'
// 帖子接口：getMyItems 取“我发布的帖子”，getFavoriteItems 取“我收藏的帖子”，deletePost 删除指定帖子。
import { deletePost, getFavoriteItems, getMyItems } from '@/api/posts'
// 会话接口：getMyClaims 取“我发起的认领会话”列表。
import { getMyClaims } from '@/api/conversations'
// 全局登录态：user 是当前登录用户（响应式），用于判断是否已登录。
import { useAuth } from '@/stores/auth'
// 只引入类型，编译后会被擦除，不产生运行时开销。
import type { ClaimApplication, LostItem } from '@/types'
// 展示工具：formatDate 格式化时间；itemStatusText 把后端状态码转成中文。
import { formatDate, itemStatusText } from '@/utils/format'

// 标签页取值的联合类型，限定只能是 'items'（我的发布）、'claims'（我的认领）或 'favorites'（我的收藏）。
type RecordTab = 'items' | 'claims' | 'favorites'
// useRoute 返回当前路由对象，用来读取 query.tab 决定初始标签。
const route = useRoute()
// useRouter 返回路由实例，下面 switchTab 用它把 tab 同步写回 URL。
const router = useRouter()
const { user } = useAuth()
// 我发布的帖子数组；ref 包裹后，给它赋值会自动触发模板重新渲染。
const myItems = ref<LostItem[]>([])
// 我的认领会话数组。
const claims = ref<ClaimApplication[]>([])
// 我收藏的帖子数组（结构与「我发布的」一致，都是 LostItem）。
const favorites = ref<LostItem[]>([])
// 当前标签页。刻意从 URL 的 ?tab 查询参数推导初值，而不是另建一份本地 state：
// 这样刷新页面或分享链接都能还原到同一个标签，也方便导航栏等外部通过改 URL 联动切换。
// 依次匹配 claims / favorites，都不匹配时回落到默认的 items。
const activeTab = ref<RecordTab>(route.query.tab === 'claims' ? 'claims' : route.query.tab === 'favorites' ? 'favorites' : 'items')
const loading = ref(false)
const errorMessage = ref('')
// 正在删除的帖子 id：只禁用那一行的按钮并显示“删除中...”，避免整页 loading 闪烁。
const deletingId = ref<number | null>(null)
// computed 派生值：跟随 loading，供模板里“刷新记录”按钮的 :disabled 使用，会自动响应更新。
const currentLoading = computed(() => loading.value)

/**
 * 切换“我的发布 / 我的认领”标签。
 * 触发方式：点击模板里两个 role="tab" 按钮。
 * 既更新本地 activeTab（立即切换视图），又把 tab 写回 URL 的 query。
 * 这里用 router.replace 而不是 push：切换标签不该在浏览历史里堆一堆记录，
 * 这样用户点“后退”能直接回到进入本页之前的那个页面。
 */
function switchTab(tab: RecordTab) {
  activeTab.value = tab
  // items 是默认标签，不需要写进 URL（保持 /mine 干净）；其余标签写成 ?tab=xxx。
  router.replace({ query: tab === 'items' ? {} : { tab } })
}

/**
 * 加载三份列表数据：“我发布的帖子”“我的认领”“我的收藏”。
 * 触发方式：组件挂载时（onMounted(loadRecords)）以及点击“刷新记录”按钮。
 * 用 Promise.all 并发请求，比一个个 await 串行更快。
 * 失败时把错误写入 errorMessage 由模板展示；无论成败都在 finally 关闭 loading。
 */
async function loadRecords() {
  // 未登录直接返回，避免发出必然 401 的请求。
  if (!user.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    // getMyItems 与 getFavoriteItems 实际都调 GET /auth/profile（分别取 posts / favorites 两个字段）；
    // getMyClaims 调 GET /conversations，内部会用 requestAllPages 自动翻页取全量。
    const [items, claimRows, favoriteRows] = await Promise.all([getMyItems(), getMyClaims(), getFavoriteItems()])
    myItems.value = items
    claims.value = claimRows
    favorites.value = favoriteRows
  } catch (error) {
    // error 若不是 Error 实例，给一个兜底文案，保证界面总有提示。
    errorMessage.value = error instanceof Error ? error.message : '记录加载失败'
  } finally {
    loading.value = false
  }
}

/**
 * 删除一条我发布的帖子。
 * 触发方式：点击某行的“删除”按钮。
 * 先用 window.confirm 二次确认，再用 deletingId 锁定该行防止重复点击，
 * 然后调用 deletePost 删除；成功后本地过滤掉这条记录，让界面即时更新。
 * 若担心服务端与本地数据不一致，可点页面上的“刷新记录”重新调用 loadRecords 全量对齐。
 */
async function removeItem(id: number) {
  // deletingId 非 null 说明已有删除在进行中，直接返回，避免并发重复删除。
  if (deletingId.value !== null || !window.confirm('确定要删除这条发布吗？')) return
  deletingId.value = id
  try {
    await deletePost(id)
    // 用 filter 生成一个不含该 id 的新数组并赋给 ref，从而触发响应式刷新。
    myItems.value = myItems.value.filter((item) => item.id !== id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败'
  } finally {
    deletingId.value = null
  }
}

/**
 * 计算一条帖子在列表中显示的状态文案。
 * isFinished 为真优先显示“已完成”，否则把后端状态码翻译成中文。
 */
function itemStatus(item: LostItem) {
  return item.isFinished ? '已完成' : itemStatusText(item.status)
}

// onMounted：组件挂载完成后执行一次 loadRecords，实现“进入页面即加载数据”。
onMounted(loadRecords)
</script>

<template>
  <!-- 页面头部：标题 + 操作区。点“刷新记录”触发 loadRecords；RouterLink 是路由链接，点击跳 /publish -->
  <section class="section-heading"><div><p class="eyebrow">YOUR ACTIVITY</p><h1>我的记录</h1><p class="page-lead">查看你发布的信息、参与过的认领沟通和收藏的内容。</p></div><div class="form-actions"><button class="secondary-button" :disabled="currentLoading" @click="loadRecords">刷新记录</button><RouterLink to="/publish" class="primary-button">发布新信息</RouterLink></div></section>
  <!-- v-if：只有 errorMessage 非空时才渲染这段错误提示 -->
  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  <!-- 标签切换区：三个按钮的 :class / :aria-selected 反映 activeTab，点击调用 switchTab 并同步 URL -->
  <!-- 三个标签按钮由同一个 switchTab 驱动：既切视图也把 ?tab 写回 URL -->
  <div class="tabs" role="tablist"><button type="button" role="tab" :aria-selected="activeTab === 'items'" :class="{ selected: activeTab === 'items' }" @click="switchTab('items')">我的发布（{{ myItems.length }}）</button><button type="button" role="tab" :aria-selected="activeTab === 'claims'" :class="{ selected: activeTab === 'claims' }" @click="switchTab('claims')">我的认领（{{ claims.length }}）</button><button type="button" role="tab" :aria-selected="activeTab === 'favorites'" :class="{ selected: activeTab === 'favorites' }" @click="switchTab('favorites')">我的收藏（{{ favorites.length }}）</button></div>
  <!-- 我的发布面板：仅当 activeTab 为 'items' 时显示 -->
  <section v-if="activeTab === 'items'" class="record-list">
    <!-- 加载中占位；下面 v-else-if 用 v-for 遍历 myItems，:key=item.id 帮助 Vue 高效复用 DOM -->
    <div v-if="loading" class="empty-state">正在加载你的发布记录...</div>
    <template v-else-if="myItems.length"><article v-for="item in myItems" :key="item.id" class="record-row"><div class="record-main"><RouterLink :to="`/items/${item.id}`" class="record-title">{{ item.title }}</RouterLink><p class="muted">{{ item.type === 'lost' ? '失物' : '招领' }} · {{ item.location }} · {{ formatDate(item.createdAt) }}</p></div><div class="record-actions"><span class="status-pill">{{ itemStatus(item) }}</span><button class="text-button" :disabled="deletingId === item.id" @click="removeItem(item.id)">{{ deletingId === item.id ? '删除中...' : '删除' }}</button></div></article></template>
    <!-- 非加载且列表为空时的空状态提示 -->
    <div v-else class="empty-state">你还没有发布过信息。</div>
  </section>
  <!-- 我的认领面板：仅当 activeTab 为 'claims' 时显示 -->
  <section v-else-if="activeTab === 'claims'" class="record-list">
    <!-- 认领列表加载占位；下面 v-else-if 用 v-for 遍历 claims，每项链到对应会话详情页 -->
    <div v-if="loading" class="empty-state">正在加载你的认领记录...</div>
    <template v-else-if="claims.length"><article v-for="claim in claims" :key="claim.id" class="record-row"><div class="record-main"><RouterLink :to="`/conversations/${claim.id}`" class="record-title">{{ claim.itemTitle }}</RouterLink><p class="muted">开始沟通：{{ formatDate(claim.createdAt) }}</p></div><div class="record-actions"><span class="status-pill">沟通中</span><RouterLink class="detail-link" :to="`/conversations/${claim.id}`">查看对话</RouterLink></div></article></template>
    <!-- 没有认领记录时的空状态提示 -->
    <div v-else class="empty-state">你还没有提交过认领申请。</div>
  </section>
  <!-- 我的收藏面板：v-else 兜底，即 activeTab 为 'favorites' 时显示。
       数据来自 /auth/profile 的 favorites 字段（见 api/posts.ts 的 getFavoriteItems）。 -->
  <section v-else class="record-list">
    <div v-if="loading" class="empty-state">正在加载你的收藏...</div>
    <template v-else-if="favorites.length"><article v-for="item in favorites" :key="item.id" class="record-row"><div class="record-main"><RouterLink :to="`/items/${item.id}`" class="record-title">{{ item.title }}</RouterLink><p class="muted">{{ item.type === 'lost' ? '失物' : '招领' }} · {{ item.location }} · {{ formatDate(item.createdAt) }}</p></div><div class="record-actions"><span class="status-pill">{{ itemStatus(item) }}</span><RouterLink class="detail-link" :to="`/items/${item.id}`">查看详情</RouterLink></div></article></template>
    <div v-else class="empty-state">你还没有收藏过任何信息。</div>
  </section>
</template>
