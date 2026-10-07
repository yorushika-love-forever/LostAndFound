<!--
  物品详情页（路由：`/items/:id`，受登录保护，见 router/index.ts）。
  作用：展示单条物品的图片、描述、发布信息；提供「申请认领 / 召领」表单；下方展示并管理评论。
  读取接口：getItem(id)（`GET /posts/:id`）、getComments(id)（`GET /posts/:id/comments`）、
           getFavoriteItems()（`GET /auth/profile` 的收藏夹，仅用于判断本条目是否已被收藏）。
  写入接口：createClaim()（发起会话）、createComment() / deleteComment()、
           addFavorite() / removeFavorite()（收藏 / 取消收藏）。
  主要交互：收藏 / 取消收藏、展开认领表单、提交认领后跳转会话页、发表评论、删除自己的评论；
  是否显示删除按钮由评论的 userId 与当前登录用户比较决定。
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createClaim } from '@/api/conversations'
import { createComment, deleteComment, getComments } from '@/api/comments'
import { addFavorite, getItem, getFavoriteItems, removeFavorite } from '@/api/posts'
import { useAuth } from '@/stores/auth'
import type { Comment, LostItem } from '@/types'
import { formatDate, itemStatusText } from '@/utils/format'

// useRoute() 读取当前路由信息（这里用 params.id 拿到要展示的物品 id）。
const route = useRoute()
// useRouter() 拿到路由器实例，用于编程式跳转 router.push()。
const router = useRouter()
// useAuth() 提供全局登录用户 user（一个 ref），用于判断「是不是我发布的 / 我发的评论」。
const { user } = useAuth()
// 详情先置空：模板用 v-if="item" 判断是否渲染，避免首次渲染时就访问 undefined。
const item = ref<LostItem>()
// 评论列表；每条评论的 authorName 由后端按 user_id 关联用户表回填。
const comments = ref<Comment[]>([])
const reason = ref('')
const commentText = ref('')
// 认领表单默认收起，点按钮才展开。
const showClaimForm = ref(false)
const loadingError = ref('')
// message 用于「认领提交失败」提示；commentError 单独存放，避免两类错误互相覆盖。
const message = ref('')
const commentError = ref('')
// 整页 loading 初值为 true：详情还没回来前先显示占位，而不是误报「物品不存在」。
const loading = ref(true)
const commentsLoading = ref(false)
// 提交类 loading：用于禁用按钮，防止网络慢时重复点击造成重复提交。
const submittingClaim = ref(false)
const submittingComment = ref(false)
// 记录正在删除的评论 id（null 表示无）：只禁用被删那条的按钮，其余评论仍可操作。
const deletingCommentId = ref<number | null>(null)
// 当前条目是否已被我收藏。后端帖子本身不带 is_favorited 字段，只能在挂载时
// 拉一次「我的收藏」逐条比对得出初值，之后由 toggleFavorite 的返回值维护。
const favorited = ref(false)
// 收藏请求进行中标记：用于禁用按钮，防止网络慢时连点造成「收藏/取消」来回发请求。
const favoriteLoading = ref(false)
// 收藏操作的错误提示；与 message / commentError 分开，互不覆盖。
const favoriteError = ref('')
// 路由参数是字符串，转成 number 再传给接口；`/items/:id` 里的 id 就来自这里。
const itemId = Number(route.params.id)

/**
 * 页面挂载时加载详情与评论。
 * 触发时机：组件首次进入时执行一次（onMounted）。
 * 调用接口：getItem(itemId)、getComments(itemId)。
 * 成功：分别写入 item、comments。
 * 失败：写入 loadingError；finally 中无论如何都关掉 loading，
 *      否则请求失败会永远停在「正在加载」。
 */
onMounted(async () => {
  try {
    item.value = await getItem(itemId)
    commentsLoading.value = true
    comments.value = await getComments(itemId)
  } catch (error) {
    loadingError.value = error instanceof Error ? error.message : '物品详情加载失败'
  } finally {
    loading.value = false
    commentsLoading.value = false
  }

  // 收藏初值单独请求、单独 try/catch：详情已经渲染成功了，
  // 不能因为这一次「查收藏夹」失败就把整页判为加载失败，
  // 失败时保持「未收藏」的默认态即可（点收藏仍会按后端真实结果纠正）。
  if (item.value) {
    try {
      // some() 只要找到同 id 的收藏就返回 true，比 filter 更早短路、也无额外数组开销。
      favorited.value = (await getFavoriteItems()).some((favorite) => favorite.id === itemId)
    } catch {
      // 故意静默：收藏状态属于锦上添花的信息，失败不打扰用户。
    }
  }
})

/**
 * 切换收藏 / 取消收藏。
 * 触发时机：点击详情页的收藏按钮。
 * 逻辑：按当前 favorited 反向调用 remove/add 接口，并用「后端返回的 favorited」覆盖本地状态，
 *      而不是本地取反——这样即便本地状态与服务端不一致（比如另一台设备刚改过），
 *      也能被后端返回值纠正回来。
 * 失败：写入 favoriteError 提示；finally 复位 favoriteLoading 恢复按钮可点。
 */
async function toggleFavorite() {
  // 详情未就绪或请求进行中直接返回，避免用空 item 调接口 / 重复提交。
  if (!item.value || favoriteLoading.value) return
  favoriteLoading.value = true
  favoriteError.value = ''
  try {
    favorited.value = favorited.value
      ? await removeFavorite(item.value.id)
      : await addFavorite(item.value.id)
  } catch (error) {
    favoriteError.value = error instanceof Error ? error.message : '收藏操作失败'
  } finally {
    favoriteLoading.value = false
  }
}

/**
 * 提交认领 / 召领申请。
 * 触发时机：认领表单 @submit.prevent 提交（回车或点「提交申请」）。
 * 调用接口：createClaim(item, reason) —— 先创建会话，再把认领理由作为首条消息发出。
 * 成功：跳转到会话页 /conversations/:id，开始与发布者沟通。
 * 失败：把错误写进 message 展示；finally 复位 submittingClaim，恢复按钮。
 */
async function submitClaim() {
  // 详情还没加载出来、或正在提交时直接返回：既防重复提交，也避免用空 item 调接口。
  if (!item.value || submittingClaim.value) return
  submittingClaim.value = true
  message.value = ''
  try {
    const conversation = await createClaim(item.value, reason.value)
    await router.push(`/conversations/${conversation.id}`)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '提交失败'
  } finally {
    submittingClaim.value = false
  }
}

/**
 * 发表评论。
 * 触发时机：评论表单 @submit.prevent 提交。
 * 调用接口：createComment(itemId, content)。
 * 成功：把后端返回的新评论 unshift 到数组最前（最新显示在上），并清空输入框。
 * 失败：写入 commentError 提示。
 */
async function submitComment() {
  // 先 trim：全空格的评论没有意义，视为未填写直接忽略。
  const content = commentText.value.trim()
  if (!content || submittingComment.value) return
  submittingComment.value = true
  commentError.value = ''
  try {
    comments.value.unshift(await createComment(itemId, content))
    commentText.value = ''
  } catch (error) {
    commentError.value = error instanceof Error ? error.message : '评论发表失败'
  } finally {
    submittingComment.value = false
  }
}

/**
 * 删除一条评论。
 * 触发时机：点评论右侧「删除」按钮（仅当该评论属于当前用户时才渲染该按钮）。
 * 调用接口：deleteComment(id)。
 * 成功：用 filter 在前端移除这条，避免为一次删除重新拉取整个列表。
 * 失败：写入 commentError；finally 清空 deletingCommentId 恢复按钮可用。
 */
async function removeComment(id: number) {
  // 原生确认框做二次确认，防止误删。
  if (!window.confirm('确定删除这条评论吗？')) return
  deletingCommentId.value = id
  try {
    await deleteComment(id)
    comments.value = comments.value.filter((comment) => comment.id !== id)
  } catch (error) {
    commentError.value = error instanceof Error ? error.message : '评论删除失败'
  } finally {
    deletingCommentId.value = null
  }
}
</script>

<template>
  <!-- 详情主区：只有 item 就绪才渲染；加载中 / 失败走下面两个分支 -->
  <div v-if="item" class="detail-layout">
    <!-- imageUrl 是后端返回的相对路径 /uploads/posts/xxx.png，同源经反向代理加载；
         后端未存图时 mapPost 已回落到默认图，所以这里直接用即可。 -->
    <img :src="item.imageUrl" :alt="item.title" class="detail-image" />
    <section class="detail-content">
      <!-- :class="item.type" 动态加类名，用不同配色区分「寻找失物 / 拾获招领」 -->
      <span class="type-label" :class="item.type">{{ item.type === 'lost' ? '寻找失物' : '拾获招领' }}</span>
      <h1>{{ item.title }}</h1>
      <p class="detail-description">{{ item.description }}</p>
      <!-- dl/dt/dd 是语义化的「名称-值」列表，用来罗列物品元信息 -->
      <dl class="info-list">
        <div><dt>地点</dt><dd>{{ item.location }}</dd></div>
        <!-- 只有填了补充地点才显示这一行 -->
        <div v-if="item.supplement"><dt>地点补充</dt><dd>{{ item.supplement }}</dd></div>
        <div><dt>发布时间</dt><dd>{{ formatDate(item.createdAt) }}</dd></div>
        <!-- 已完成优先显示「已完成」，否则把 status 翻译成「待审核/已通过/被驳回」 -->
        <div><dt>状态</dt><dd>{{ item.isFinished ? '已完成' : itemStatusText(item.status) }}</dd></div>
        <div><dt>发布者</dt><dd>{{ item.publisherName }}</dd></div>
      </dl>
      <!-- 收藏 / 取消收藏：任何登录用户（含发布者本人）都能收藏。
           按钮样式随 favorited 切换（已收藏=实心主按钮，未收藏=描边次按钮），
           :disabled 在请求进行中禁用，避免连点发出多次收藏/取消请求。 -->
      <div class="detail-actions">
        <button :class="favorited ? 'primary-button' : 'secondary-button'" :disabled="favoriteLoading" @click="toggleFavorite">{{ favoriteLoading ? '处理中...' : favorited ? '已收藏' : '收藏此条' }}</button>
      </div>
      <p v-if="favoriteError" class="error-message">{{ favoriteError }}</p>
      <!-- 三个条件同时满足才显示认领按钮：不是自己发布的、已审核通过、且未完成 -->
      <button v-if="item.publisherId !== user?.id && item.status === 'approved' && !item.isFinished" class="primary-button" @click="showClaimForm = !showClaimForm">申请认领 / 召领</button>
      <p v-if="item.publisherId === user?.id" class="muted">这是你发布的信息。</p>
      <p v-if="message" class="success-message">{{ message }}</p>
      <!-- @submit.prevent 阻止表单默认提交（会刷新页面），改由 submitClaim 走 fetch 提交 -->
      <form v-if="showClaimForm" class="claim-form panel" @submit.prevent="submitClaim">
        <label>认领依据<textarea v-model="reason" required maxlength="1000" placeholder="描述物品特征，帮助发布者核实"></textarea></label>
        <!-- :disabled 绑定提交中状态，按钮文案也随状态变化（防止重复提交） -->
        <button class="primary-button" :disabled="submittingClaim">{{ submittingClaim ? '建立沟通中...' : '提交申请' }}</button>
      </form>
    </section>
  </div>
  <!-- 尚未返回且不在报错：显示加载占位 -->
  <div v-else-if="loading" class="empty-state">正在加载物品详情...</div>
  <!-- 其余情况（加载完无数据或出错）：展示错误或兜底文案 -->
  <div v-else class="empty-state">{{ loadingError || '物品不存在或暂不可见' }}</div>

  <!-- 评论区：与详情一致，item 就绪才显示 -->
  <section v-if="item" class="comments-section">
    <div class="section-heading"><div><p class="eyebrow">COMMENTS</p><h2>留言</h2></div><span class="result-count">{{ comments.length }} 条</span></div>
    <!-- 发表评论表单：同样用 @submit.prevent 拦截默认行为 -->
    <form class="panel comment-form" @submit.prevent="submitComment">
      <textarea v-model="commentText" maxlength="1000" required placeholder="补充线索或礼貌留言"></textarea>
      <div class="form-actions"><button class="primary-button" :disabled="submittingComment">{{ submittingComment ? '发表中...' : '发表评论' }}</button></div>
    </form>
    <p v-if="commentError" class="error-message">{{ commentError }}</p>
    <div v-if="commentsLoading" class="empty-state">正在加载留言...</div>
    <div v-else-if="comments.length" class="comment-list">
      <!-- :key 用 comment.id：删除后数组变化，稳定 id 才能让 Vue 精确复用剩余节点 -->
      <article v-for="comment in comments" :key="comment.id" class="comment-row">
        <div><strong>{{ comment.authorName }}</strong><time>{{ formatDate(comment.createdAt) }}</time><p>{{ comment.content }}</p></div>
        <!-- 仅评论作者本人可见删除按钮；:disabled 只针对正在删除的这一条 -->
        <button v-if="comment.userId === user?.id" class="text-button" :disabled="deletingCommentId === comment.id" @click="removeComment(comment.id)">删除</button>
      </article>
    </div>
    <div v-else class="empty-state">还没有留言，来留下第一条线索吧。</div>
  </section>
</template>
